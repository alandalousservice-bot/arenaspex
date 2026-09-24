# PDF roster parser third-party notices

ArenaSPEX uses `@embedpdf/pdfium` version `2.15.1` for local PDF text extraction.
The npm package declares MIT and includes `LICENSE` for the package itself.
The bundled PDFium runtime is accompanied by `LICENSE.pdfium`, which includes
PDFium's BSD-style redistribution notice and Apache License 2.0 text. The
installed package does not contain a separate `NOTICE` file.

Keep both package-provided files with distributions that include this runtime:

- `node_modules/@embedpdf/pdfium/LICENSE`
- `node_modules/@embedpdf/pdfium/LICENSE.pdfium`

The application loads the package's bundled WebAssembly locally; it does not
fetch the binary from a CDN or use a system-installed PDF engine. This notice
records the files included with the selected package and is not a legal opinion.
