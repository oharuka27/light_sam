import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const MODEL_ROOT = '.models'
const HF_ROOT = 'https://huggingface.co'

const files = [
  ['Xenova/slimsam-77-uniform', 'config.json'],
  ['Xenova/slimsam-77-uniform', 'preprocessor_config.json'],
  ['Xenova/slimsam-77-uniform', 'onnx/vision_encoder_quantized.onnx'],
  ['Xenova/slimsam-77-uniform', 'onnx/prompt_encoder_mask_decoder_quantized.onnx'],
  ['Xenova/clip-vit-base-patch32', 'config.json'],
  ['Xenova/clip-vit-base-patch32', 'preprocessor_config.json'],
  ['Xenova/clip-vit-base-patch32', 'tokenizer.json'],
  ['Xenova/clip-vit-base-patch32', 'tokenizer_config.json'],
  ['Xenova/clip-vit-base-patch32', 'special_tokens_map.json'],
  ['Xenova/clip-vit-base-patch32', 'vocab.json'],
  ['Xenova/clip-vit-base-patch32', 'merges.txt'],
  ['Xenova/clip-vit-base-patch32', 'onnx/model_quantized.onnx'],
]

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

for (const [model, file] of files) {
  const output = join(MODEL_ROOT, model, file)
  if (await exists(output)) {
    console.log(`skip: ${output}`)
    continue
  }

  const url = `${HF_ROOT}/${model}/resolve/main/${file}`
  console.log(`download: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`download failed (${response.status}): ${url}`)
  }

  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, new Uint8Array(await response.arrayBuffer()))
  console.log(`saved: ${output}`)
}
