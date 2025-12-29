import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { ingestCompanyDoc } from "../src/lib/rag";

async function main() {
  console.log("🌱 Seeding QuantivalQ documentation...");

  // Look up the company with slug = "quantivalq"
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    console.error('   Please create the company first by running: npm run create:quantivalq');
    process.exit(1);
  }

  console.log(`✓ Found company: ${company.displayName} (${company.id})`);

  // Prepare multiple documents about QuantivalQ
  const documents = [
    {
      title: "QuantivalQ Platform Overview",
      source: "seed",
      content: `
QuantivalQ is an AI-powered quantitative analytics platform designed for data scientists, 
financial analysts, and quantitative researchers. The platform combines advanced machine learning 
with statistical analysis to deliver powerful insights and predictive models.

Core Platform Features:
- Advanced statistical modeling and analysis
- Machine learning model training and deployment
- Real-time data processing and analytics
- Predictive analytics and forecasting
- Risk analysis and portfolio optimization
- Time series analysis and forecasting
- Custom algorithm development environment
- API access for programmatic integration

Target Users:
- Data Scientists: Build and deploy ML models with ease
- Quantitative Analysts: Perform complex financial analysis
- Financial Analysts: Generate insights from market data
- Researchers: Conduct statistical research and experiments
- Trading Teams: Develop and backtest trading strategies

Key Benefits:
- Reduce model development time by 60%
- Increase prediction accuracy with ensemble methods
- Automate data preprocessing and feature engineering
- Scale analytics from gigabytes to petabytes
- Collaborate on models with team members
      `.trim(),
    },
    {
      title: "QuantivalQ Pricing and Plans",
      source: "seed",
      content: `
QuantivalQ offers flexible pricing plans to suit teams of all sizes:

Starter Plan - $99/month:
- Up to 10GB data processing per month
- 5 active models
- Basic statistical analysis tools
- Email support
- Community forum access
- Perfect for individual researchers and small teams

Professional Plan - $499/month:
- Up to 100GB data processing per month
- Unlimited active models
- Advanced ML algorithms and ensemble methods
- Priority email support
- API access with 100K requests/month
- Custom model deployment
- Best for growing teams and mid-size companies

Enterprise Plan - Custom Pricing:
- Unlimited data processing
- Unlimited models and deployments
- Dedicated infrastructure
- 24/7 phone and email support
- Custom SLA guarantees
- On-premise deployment options
- White-glove onboarding
- Custom integrations
- Ideal for large organizations with high-volume needs

All plans include:
- Real-time analytics dashboard
- Model versioning and management
- Collaboration tools
- Data visualization tools
- Export capabilities (CSV, JSON, Excel)
- Security and compliance (SOC 2, GDPR)

Free Trial:
Start with a 14-day free trial. No credit card required. Full access to Professional features.
      `.trim(),
    },
    {
      title: "QuantivalQ Machine Learning Capabilities",
      source: "seed",
      content: `
QuantivalQ provides comprehensive machine learning capabilities for quantitative analysis:

Supervised Learning:
- Regression models (Linear, Polynomial, Ridge, Lasso)
- Classification (Logistic Regression, Random Forest, XGBoost, Neural Networks)
- Time series forecasting (ARIMA, LSTM, Prophet)
- Ensemble methods for improved accuracy

Unsupervised Learning:
- Clustering algorithms (K-means, DBSCAN, Hierarchical)
- Dimensionality reduction (PCA, t-SNE, UMAP)
- Anomaly detection
- Feature extraction and selection

Deep Learning:
- Neural networks (Feedforward, CNN, RNN, LSTM, Transformer)
- Transfer learning support
- AutoML for automated model selection
- Hyperparameter optimization

Model Management:
- Version control for models
- A/B testing framework
- Model performance monitoring
- Automated retraining pipelines
- Model deployment to production

Data Preprocessing:
- Automated data cleaning
- Feature engineering tools
- Missing value imputation
- Outlier detection and handling
- Data normalization and scaling

Model Evaluation:
- Cross-validation support
- Performance metrics (Accuracy, Precision, Recall, F1, AUC-ROC)
- Residual analysis
- Feature importance visualization
- Model interpretability tools
      `.trim(),
    },
    {
      title: "QuantivalQ API Documentation",
      source: "seed",
      content: `
QuantivalQ provides a comprehensive REST API for programmatic access to all platform features.

Authentication:
All API requests require authentication using an API key. Include your API key in the Authorization header:
Authorization: Bearer YOUR_API_KEY

Base URL:
https://api.quantivalq.com/v1

Key Endpoints:

Data Management:
- POST /data/upload - Upload datasets
- GET /data/{datasetId} - Retrieve dataset information
- DELETE /data/{datasetId} - Delete a dataset
- GET /data/{datasetId}/preview - Preview dataset samples

Model Training:
- POST /models/train - Train a new model
- GET /models/{modelId} - Get model details
- GET /models/{modelId}/status - Check training status
- POST /models/{modelId}/predict - Make predictions

Analytics:
- POST /analytics/analyze - Run statistical analysis
- GET /analytics/{analysisId}/results - Get analysis results
- POST /analytics/forecast - Generate forecasts

Rate Limits:
- Starter Plan: 1,000 requests/day
- Professional Plan: 100,000 requests/month
- Enterprise Plan: Unlimited

Response Format:
All API responses are in JSON format. Successful requests return status code 200, 
while errors return appropriate HTTP status codes (400, 401, 404, 500) with error details.

SDKs Available:
- Python SDK (pip install quantivalq)
- R SDK (install.packages("quantivalq"))
- JavaScript/TypeScript SDK (npm install @quantivalq/sdk)
      `.trim(),
    },
    {
      title: "QuantivalQ Use Cases",
      source: "seed",
      content: `
QuantivalQ is used across various industries and use cases:

Financial Services:
- Credit risk modeling and scoring
- Fraud detection and prevention
- Portfolio optimization
- Algorithmic trading strategy development
- Market prediction and forecasting
- Regulatory compliance analysis

E-commerce and Retail:
- Demand forecasting
- Price optimization
- Customer segmentation
- Churn prediction
- Recommendation systems
- Inventory management

Healthcare:
- Patient outcome prediction
- Drug discovery analysis
- Medical image analysis
- Clinical trial optimization
- Resource allocation

Manufacturing:
- Predictive maintenance
- Quality control
- Supply chain optimization
- Production forecasting
- Defect detection

Technology:
- User behavior analysis
- A/B testing and experimentation
- Anomaly detection in systems
- Performance optimization
- Resource allocation

Research and Academia:
- Statistical research
- Experimental design
- Data analysis for publications
- Hypothesis testing
- Meta-analysis

Success Stories:
- Financial firm reduced credit risk by 25% using our ML models
- E-commerce company increased revenue by 15% with demand forecasting
- Healthcare provider improved patient outcomes by 30% with predictive analytics
- Manufacturing company reduced downtime by 40% with predictive maintenance
      `.trim(),
    },
  ];

  // Ingest all documents
  let successCount = 0;
  let errorCount = 0;

  for (const doc of documents) {
    try {
      const document = await ingestCompanyDoc({
        companyId: company.id,
        title: doc.title,
        source: doc.source,
        content: doc.content,
      });

      console.log(`✓ Document created: ${document.title} (${document.id})`);
      successCount++;
    } catch (error) {
      console.error(`✗ Error ingesting "${doc.title}":`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Successfully ingested: ${successCount} documents`);
  if (errorCount > 0) {
    console.log(`   Failed: ${errorCount} documents`);
  }
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Run: npm run seed:quantivalq:images`);
  console.log(`   2. Test RAG at: http://localhost:3000/widget/quantivalq`);
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
