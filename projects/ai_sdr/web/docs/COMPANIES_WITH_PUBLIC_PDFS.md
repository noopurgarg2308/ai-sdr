# Companies with Public PDFs for Testing

Here are real companies with publicly available PDFs and presentations that you can download and use as test datasets for QuantivalQ.

## 🏆 Best Options (Recommended)

### 1. **Airbnb** ⭐⭐⭐⭐⭐
**Why:** Comprehensive investor presentations, annual reports, and product documentation

**Available PDFs:**
- **Investor Presentations**: https://investors.airbnb.com/resources/default.aspx
- **Q4 2024 Shareholder Letter**: https://airbnb2020ipo.q4web.com/files/doc_financials/2024/q4/Airbnb_Q4-2024-Shareholder-Letter_Final.pdf
- **2023 Annual Report**: https://airbnb2020ipo.q4web.com/files/doc_financials/2023/q4/AIRBNB-10K-20241602.pdf

**What to download:**
- Investor presentations (quarterly)
- Annual reports (10-K filings)
- Shareholder letters

**Why it's good for testing:**
- Rich content about business model, products, financials
- Well-structured documents
- Multiple document types (presentations, reports)

---

### 2. **Stripe** ⭐⭐⭐⭐
**Why:** Product documentation, API guides, and business resources

**Available PDFs:**
- **Stripe Atlas Guide**: Available on their website
- **Stripe Terminal Product Sheets**: Product documentation PDFs
- **API Documentation**: Can be exported as PDF

**What to download:**
- Product documentation
- Integration guides
- Business resources

**Why it's good for testing:**
- Technical content (good for RAG testing)
- Product-focused documentation
- Multiple document types

---

### 3. **Shopify** ⭐⭐⭐⭐
**Why:** Product guides, user manuals, and business resources

**Available PDFs:**
- **Shopify User Guide**: Third-party guides available
- **Product Documentation**: Help center content
- **Business Resources**: Ebooks and guides

**What to download:**
- User guides
- Product documentation
- Business resources

---

### 4. **Notion** ⭐⭐⭐
**Why:** Public pitch deck and product documentation

**Available PDFs:**
- **2013 Seed Pitch Deck**: https://www.notion.so/Notion-Seed-Pitch-Deck-2013-26634e24c14543d7a1c72325bcb2df
- Product templates and documentation

**What to download:**
- Pitch deck (interesting for testing)
- Product documentation

---

## 📥 How to Download and Use

### Step 1: Download PDFs

**For Airbnb:**
```bash
# Create a folder for downloads
mkdir -p ~/Downloads/airbnb-docs

# Download using curl or wget
cd ~/Downloads/airbnb-docs

# Download Q4 2024 Shareholder Letter
curl -O https://airbnb2020ipo.q4web.com/files/doc_financials/2024/q4/Airbnb_Q4-2024-Shareholder-Letter_Final.pdf

# Download 2023 Annual Report
curl -O https://airbnb2020ipo.q4web.com/files/doc_financials/2023/q4/AIRBNB-10K-20241602.pdf

# Visit https://investors.airbnb.com/resources/default.aspx for more presentations
```

### Step 2: Convert PDFs to Text (if needed)

If you want to upload as text files instead of PDFs:

```bash
# Install pdftotext (if not installed)
# macOS: brew install poppler
# Linux: sudo apt-get install poppler-utils

# Convert PDF to text
pdftotext Airbnb_Q4-2024-Shareholder-Letter_Final.pdf airbnb-q4-2024.txt
pdftotext AIRBNB-10K-20241602.pdf airbnb-2023-annual-report.txt
```

### Step 3: Upload to QuantivalQ

**Option A: Upload PDFs via Admin UI**
1. Go to: http://localhost:3000/admin/companies/cmj52tf810000w3lw1rvkkieh/media
2. Upload PDF files (they'll be processed automatically)

**Option B: Upload Text Files via Script**
1. Copy text files to: `scripts/quantivalq-docs/`
2. Run: `npm run upload:quantivalq:text`

---

## 🎯 Recommended Test Dataset

**For a good test, download:**

1. **Airbnb Q4 2024 Shareholder Letter** (business overview)
2. **Airbnb 2023 Annual Report** (comprehensive company info)
3. **1-2 Investor Presentations** (product/business details)

This gives you:
- ✅ Business model information
- ✅ Product details
- ✅ Financial information
- ✅ Company strategy
- ✅ Multiple document types

---

## 🔍 Other Companies to Consider

### Tech Companies:
- **Salesforce**: Investor relations presentations
- **Microsoft**: Annual reports and product documentation
- **Google/Alphabet**: Investor presentations
- **Amazon**: Annual reports (10-K filings)

### How to Find More:
1. Search: `"[Company Name] investor relations PDF"`
2. Visit: `https://investors.[company].com` or `https://ir.[company].com`
3. Look for: "Presentations", "Annual Reports", "10-K Filings"

### SEC EDGAR Database:
- **SEC EDGAR**: https://www.sec.gov/edgar/search/
- Search for any public company's 10-K, 10-Q, and investor presentations
- All documents are publicly available PDFs

---

## 📝 Quick Start Commands

```bash
# 1. Download Airbnb documents
mkdir -p ~/Downloads/airbnb-docs
cd ~/Downloads/airbnb-docs

# Download Q4 2024 Shareholder Letter
curl -L -o airbnb-q4-2024.pdf "https://airbnb2020ipo.q4web.com/files/doc_financials/2024/q4/Airbnb_Q4-2024-Shareholder-Letter_Final.pdf"

# Download 2023 Annual Report
curl -L -o airbnb-2023-annual.pdf "https://airbnb2020ipo.q4web.com/files/doc_financials/2023/q4/AIRBNB-10K-20241602.pdf"

# 2. Upload to QuantivalQ (via admin UI)
# Go to: http://localhost:3000/admin/companies/cmj52tf810000w3lw1rvkkieh/media
# Upload the PDF files

# OR convert to text and upload via script
pdftotext airbnb-q4-2024.pdf airbnb-q4-2024.txt
pdftotext airbnb-2023-annual.pdf airbnb-2023-annual.txt

# Copy to scripts folder
cp *.txt /path/to/web/scripts/quantivalq-docs/

# Upload
cd /path/to/web
npm run upload:quantivalq:text
```

---

## ✅ Testing Checklist

After uploading:
- [ ] Run: `npm run check:quantivalq` (verify documents are uploaded)
- [ ] Run: `npm run test:quantivalq:rag` (test RAG search)
- [ ] Test widget: http://localhost:3000/widget/quantivalq
- [ ] Ask questions like:
  - "What is Airbnb's business model?"
  - "What are Airbnb's key products?"
  - "What was Airbnb's revenue in 2023?"

---

*Last updated: December 13, 2025*
