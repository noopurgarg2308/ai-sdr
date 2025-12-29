# Download Instructions for Test PDFs

## ⚠️ Automated Download Failed

The automated download encountered network/timeout issues. Please download the files manually using one of the methods below.

## 🎯 Recommended: Airbnb Documents

### Direct Download Links

1. **Q4 2024 Shareholder Letter** (Business Overview)
   ```
   https://airbnb2020ipo.q4web.com/files/doc_financials/2024/q4/Airbnb_Q4-2024-Shareholder-Letter_Final.pdf
   ```

2. **2023 Annual Report** (Comprehensive Company Info)
   ```
   https://airbnb2020ipo.q4web.com/files/doc_financials/2023/q4/AIRBNB-10K-20241602.pdf
   ```

3. **More Presentations**
   ```
   https://investors.airbnb.com/resources/default.aspx
   ```

### How to Download

**Method 1: Browser (Easiest)**
1. Click the links above or copy-paste into your browser
2. When PDF opens, click download button or right-click → "Save As"
3. Save to: `web/downloads/airbnb-docs/`

**Method 2: Terminal (if you have network access)**
```bash
cd /Users/noopurgarg/openai-dev/projects/ai_sdr/web/downloads/airbnb-docs

# Try with wget (if installed)
wget https://airbnb2020ipo.q4web.com/files/doc_financials/2024/q4/Airbnb_Q4-2024-Shareholder-Letter_Final.pdf

# Or use your browser's download manager
```

## 📤 After Downloading - Upload to QuantivalQ

### Option A: Upload PDFs via Admin UI (Recommended)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Go to media upload page:**
   ```
   http://localhost:3000/admin/companies/cmj52tf810000w3lw1rvkkieh/media
   ```

3. **Upload PDFs:**
   - Click "Choose File"
   - Select your downloaded PDF files
   - Fill in Title, Category, Description
   - Check "Auto-process" (will extract text from PDFs)
   - Click "Upload & Process"

### Option B: Convert to Text and Upload via Script

1. **Convert PDFs to text:**
   ```bash
   # Install pdftotext if needed:
   # macOS: brew install poppler
   # Linux: sudo apt-get install poppler-utils
   
   cd downloads/airbnb-docs
   pdftotext airbnb-q4-2024-shareholder-letter.pdf airbnb-q4-2024.txt
   pdftotext airbnb-2023-annual-report.pdf airbnb-2023-annual.txt
   ```

2. **Copy to scripts folder:**
   ```bash
   cp *.txt ../../scripts/quantivalq-docs/
   ```

3. **Upload via script:**
   ```bash
   cd ../..
   npm run upload:quantivalq:text
   ```

## ✅ Verify Upload

After uploading, verify the documents are in the system:

```bash
npm run check:quantivalq
```

## 🧪 Test RAG

Test that the documents are searchable:

```bash
npm run test:quantivalq:rag
```

## 🎯 Test in Widget

Visit the widget and ask questions:
```
http://localhost:3000/widget/quantivalq
```

Try questions like:
- "What is Airbnb's business model?"
- "What was Airbnb's revenue in 2023?"
- "Tell me about Airbnb's products"

---

## 🔄 Alternative: Use SEC EDGAR Database

If Airbnb's site doesn't work, you can get any public company's filings from SEC:

1. **Go to SEC EDGAR:**
   ```
   https://www.sec.gov/edgar/search/
   ```

2. **Search for any company:**
   - Airbnb, Stripe, Shopify, etc.
   - Look for "10-K" (annual reports) or "10-Q" (quarterly reports)

3. **Download PDFs:**
   - All filings are publicly available PDFs
   - Download and upload to QuantivalQ

---

*Files should be saved to: `web/downloads/airbnb-docs/`*
