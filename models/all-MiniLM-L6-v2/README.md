# all-MiniLM-L6-v2 model cache

Expected Transformers.js assets for `Xenova/all-MiniLM-L6-v2`:

- `config.json`
- `tokenizer.json`
- `tokenizer_config.json`
- `special_tokens_map.json` (if provided by the model repository)
- `onnx/model_quantized.onnx` (or the quantized ONNX filename published for this model)

The GitHub text-file connector cannot upload the model's binary ONNX weights. No fake ONNX file is included: an empty or text placeholder would look present but cannot run inference. Until the real assets are added, the worker attempts the Hugging Face model ID through the CDN; if that also fails (including offline), Cine silently falls back to the existing lexicon-only mood engine.

To complete offline inference, download the model's compatible Transformers.js files from the `Xenova/all-MiniLM-L6-v2` Hugging Face repository, preserve its folder structure (especially `onnx/`), and commit the binary weights through Git LFS. Verify the model file names against the repository's current `config.json`. Do not commit a Git LFS pointer as if it were the actual ONNX file to a static host unless the deployment process fetches LFS objects.
