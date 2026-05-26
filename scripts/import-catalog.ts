import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// Use service role key to bypass RLS for inserts
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const isReset = process.argv.includes('--reset');
const BASE_DIR = path.resolve(process.cwd(), '../categorias_site_veiculos_xlsx');

const filesToProcess = [
  { file: 'categoria_carros_e_suvs.xlsx', categoria: 'Carros & SUVs', slug: 'carros-e-suvs' },
  { file: 'categoria_pickups.xlsx', categoria: 'Pickups', slug: 'pickups' },
  { file: 'categoria_trucks.xlsx', categoria: 'Trucks', slug: 'trucks' },
  { file: 'categoria_agricola_com_marcas.xlsx', categoria: 'Agrícola', slug: 'agricola' },
  { file: 'categoria_maquinas.xlsx', categoria: 'Máquinas', slug: 'maquinas' },
  { file: 'categoria_motos.xlsx', categoria: 'Motos', slug: 'motos' },
];

async function run() {
  if (isReset) {
    console.log('Resetting table ecu_catalog...');
    const { error } = await supabase
      .from('ecu_catalog')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      console.error('Error resetting table:', error);
      return;
    }
    console.log('Table reset successful.');
  }

  for (const { file, categoria, slug } of filesToProcess) {
    const filePath = path.join(BASE_DIR, file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`\n[WARNING] File not found, skipping: ${filePath}`);
      continue;
    }

    console.log(`\nProcessing ${file}...`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = 'Dados'; // Only process "Dados" sheet
    
    if (!workbook.Sheets[sheetName]) {
      console.warn(`[WARNING] Sheet "Dados" not found in ${file}, skipping.`);
      continue;
    }

    // Convert sheet to JSON array
    const data: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const recordsToInsert = [];

    for (const row of data) {
      const tipoRegistro = row['Tipo de Registro'] || row['tipo_registro'] || '';
      
      // Skip observacoes
      if (tipoRegistro === 'Observação') continue;

      const modeloDescricao = row['Modelo/Descrição'] || row['modelo_descricao'] || '';
      const ganho = row['Ganho'] || row['ganho'] || '';
      
      // Parse CV original
      const cvOrigMatch = modeloDescricao.match(/(\d+(?:\.\d+)?)\s*CV/i);
      const cvOriginal = cvOrigMatch ? parseInt(cvOrigMatch[1]) : null;

      // Parse CV gain
      const cvGainMatch = ganho.match(/\+(\d+(?:\.\d+)?)\s*CV/i);
      const cvGain = cvGainMatch ? parseInt(cvGainMatch[1]) : null;
      const cvTuned = cvOriginal && cvGain ? cvOriginal + cvGain : null;

      // KGFM logic
      const kgfmGainMatch = ganho.match(/\+(\d+[,.]?\d*)\s*KG/i);
      // We don't parse kgfm original/tuned automatically yet according to spec

      // Preço franqueado
      const rawPrice = String(row['Valor a vista'] || row['valor_a_vista'] || '0');
      const cleanPrice = rawPrice.replace(/[^\d.,]/g, '').replace(',', '.');
      const precoFranqueado = parseFloat(cleanPrice) || null;

      recordsToInsert.push({
        categoria: categoria,
        categoria_slug: slug,
        arquivo_origem: file,
        secao_original: String(row['Seção'] || row['Secao'] || row['secao_original'] || '').trim(),
        marca: String(row['Marca'] || row['marca'] || '').trim(),
        tipo_registro: tipoRegistro,
        modelo_descricao: modeloDescricao.trim(),
        ano: String(row['Ano'] || row['ano'] || '').trim(),
        ganho: ganho.trim(),
        cv_original: cvOriginal,
        cv_tuned: cvTuned,
        kgfm_original: null,
        kgfm_tuned: null,
        aparelho: String(row['Aparelho'] || row['aparelho'] || '').trim(),
        protocolo: String(row['Protocolo'] || row['protocolo'] || '').trim(),
        cabo: String(row['Cabo'] || row['cabo'] || '').trim(),
        preco_franqueado: isNaN(precoFranqueado as number) ? null : precoFranqueado,
        preco_cliente_final: null,
        observacoes: String(row['Observações'] || row['observacoes'] || '').trim(),
        ativo: true,
        ativo_ecommerce: true
      });
    }

    if (recordsToInsert.length > 0) {
      // Chunk insert due to potential large sizes
      const chunkSize = 500;
      let insertedCount = 0;
      for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
        const chunk = recordsToInsert.slice(i, i + chunkSize);
        // Using insert instead of upsert since we don't have a reliable unique key
        const { error } = await supabase.from('ecu_catalog').insert(chunk);
        if (error) {
           console.error(`[ERROR] inserting chunk for ${file}:`, error);
        } else {
           insertedCount += chunk.length;
        }
      }
      console.log(`Successfully inserted ${insertedCount} records from ${file}`);
    } else {
      console.log(`No valid records found to insert in ${file}`);
    }
  }
  
  console.log('\nImport completed.');
}

run().catch(console.error);
