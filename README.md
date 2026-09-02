# 🛍️ Nexora Commerce

> **AI-native commerce for smarter discovery, merchant growth, and secure checkout.**

Nexora Commerce is a full-stack, multi-tenant e-commerce platform that combines **AI product discovery, merchant growth intelligence, product promotion, inventory management, Razorpay payments, and sales analytics** into one end-to-end commerce experience.

---

## ✨ The Idea

Traditional e-commerce platforms help users browse products.

**Nexora Commerce adds intelligent agents to the commerce loop.**

```text
Customer Intent
      ↓
AI Shopping Agent
      ↓
Relevant Product Discovery
      ↓
Merchant Boosts
      ↓
Cart & Checkout
      ↓
Razorpay Payment
      ↓
Verified PAID Order
      ↓
Inventory Update
      ↓
Sales Analytics
      ↓
Merchant Growth Agent
      ↓
Smarter Merchant Action
```

> **Customers discover better. Merchants decide better.**

---

## 🚀 Core Features

### 🤖 AI Shopping Agent

Customers can search naturally instead of relying only on exact product names.

Examples:

```text
comfortable keyboard for long coding sessions under 3000
show me beauty products
I need gaming accessories
best electronic products
```

The agent performs:

- intent extraction
- keyword detection
- budget extraction
- category understanding
- semantic similarity using embeddings
- lexical relevance scoring
- hybrid product ranking
- relevance safeguards

```text
Query
  ↓
Intent + Budget + Category
  ↓
Database Hard Filters
  ↓
Relevance Gate
  ↓
Semantic + Lexical Ranking
  ↓
Promotion Boost
  ↓
Top Relevant Products
```

**Important:** promotion can improve ranking only after a product passes relevance checks.

---

### 📈 Merchant Growth Agent

Merchants receive AI-assisted recommendations generated from verified commerce data.

The Growth Agent analyzes:

- top-selling products
- slow-moving products
- low-stock inventory
- revenue by product
- total revenue
- total units sold

The AI explanation layer is grounded in analytics retrieved from PostgreSQL instead of inventing business metrics.

---

### ⚡ Product Boosting

Merchants can promote selected products using a controlled boost system.

```text
Relevant Product + Merchant Boost
              ↓
        Higher Ranking

Unrelated Product + Merchant Boost
              ↓
          Rejected
```

This keeps customer relevance ahead of paid visibility.

---

### 💳 Razorpay Checkout

Nexora Commerce integrates Razorpay Test Mode for checkout and payment verification.

```text
Cart
 ↓
Backend Order
 ↓
Razorpay Order
 ↓
Customer Payment
 ↓
Signature & Payment Verification
 ↓
Inventory Lock / Update
 ↓
Order → PAID
 ↓
Cart Cleared
```

---

### 📊 Sales Analytics

Merchant analytics are generated from **real PAID orders only**.

Metrics include:

- revenue
- paid orders
- units sold
- average order value
- product performance
- top-performing products

Reports support:

- Daily
- Weekly
- Monthly
- Quarterly

Merchants can switch charts between:

```text
Revenue
Orders
Units Sold
```

---

### 📄 Reports

Merchants can export their sales data as:

- **CSV**
- **Print / Save as PDF**

Reports include:

```text
Report Period
Revenue
Paid Orders
Units Sold
Average Order Value
Sales Timeline
Product Performance
```

---

### 📦 Marketplace & Inventory

Merchants can:

- create and update products
- archive products
- manage inventory
- monitor stock
- view product performance

Customers can:

- browse marketplace products
- filter by category
- search normally
- use AI recommendations
- add products to cart
- complete checkout

---

### 🛒 Smart Cart

The MVP enforces a **single-merchant checkout rule**.

```text
Merchant A Product
      +
Merchant B Product
      ↓
      ❌

One Cart → One Merchant → One Order
```

---

## 🧠 AI Architecture

Nexora Commerce uses Ollama for local AI inference.

### Intent Extraction

```text
Customer Query
      ↓
Ollama
      ↓
Structured Shopping Intent
```

### Semantic Search

```text
Customer Query ──→ Embedding
                        │
Product Data ─────→ Embedding
                        │
                        ↓
                Cosine Similarity
                        ↓
                  Hybrid Ranking
```

Development models include:

```text
llama3.2:3b
nomic-embed-text
```

The system also includes deterministic fallbacks so core shopping behavior can continue if Ollama is unavailable.

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────┐
│                  FRONTEND                    │
│          Next.js + React + TypeScript        │
│                                              │
│ Customer │ Merchant │ Admin │ Analytics      │
└───────────────────────┬──────────────────────┘
                        │ REST API
                        ▼
┌──────────────────────────────────────────────┐
│                   BACKEND                    │
│              FastAPI + Python                │
│                                              │
│ Auth • Products • Marketplace • Cart         │
│ AI Shopping • Growth Agent • Boosts          │
│ Razorpay Payments • Sales Reports            │
└──────────────┬─────────────────┬─────────────┘
               │                 │
               ▼                 ▼
       ┌──────────────┐   ┌──────────────┐
       │  PostgreSQL  │   │    Ollama    │
       │              │   │ LLM          │
       │ Users        │   │ Embeddings   │
       │ Merchants    │   │ AI Agents    │
       │ Customers    │   └──────────────┘
       │ Products     │
       │ Orders       │
       │ Payments     │
       │ Boosts       │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │   Razorpay   │
       │   Test Mode  │
       └──────────────┘
```

---

## 🧰 Tech Stack

### Frontend

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

### Backend

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge)
![Alembic](https://img.shields.io/badge/Alembic-6BA81E?style=for-the-badge)

### Database & AI

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge)

### Payments

![Razorpay](https://img.shields.io/badge/Razorpay-0C2451?style=for-the-badge)

---

## 🎨 UI Direction

The interface follows a premium modern-commerce design language with:

- responsive layouts
- glassmorphism
- restrained breathing effects
- soft shadows
- subtle ambient glow
- responsive category navigation
- merchant analytics dashboards
- AI discovery panels

Motion is intentionally limited to meaningful active states such as:

```text
● Live Sales
AI Active
Revenue Highlight
```

---

## 🔐 Authentication & Roles

JWT-based role access:

```text
ADMIN
MERCHANT
CUSTOMER
```

Merchant operations remain scoped to the authenticated merchant for tenant isolation.

---

## 📁 Project Structure

```text
Nexora-Commerce/
│
├── Practice/
│   ├── alembic/
│   ├── common/
│   ├── core/
│   │   ├── apis/
│   │   │   ├── routes/
│   │   │   └── schema/
│   │   ├── controller/
│   │   ├── crud/
│   │   ├── database/
│   │   ├── model/
│   │   └── utils/
│   └── main.py
│
├── frontend/
│   ├── app/
│   │   ├── admin/
│   │   ├── merchant/
│   │   ├── shop/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── payment/
│   │   └── login/
│   ├── components/
│   ├── lib/
│   └── package.json
│
└── README.md
```

---

## ⚙️ Local Setup

### 1. Clone

```bash
git clone <YOUR_REPOSITORY_URL>
cd Nexora-Commerce
```

### 2. Create virtual environment

Windows:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Linux / macOS:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Backend dependencies

```bash
cd Practice
pip install -r requirements.txt
```

### 4. Configure environment variables

Example:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost:PORT/agentic_commerce
JWT_SECRET_KEY=YOUR_SECRET_KEY
RAZORPAY_KEY_ID=YOUR_TEST_KEY
RAZORPAY_KEY_SECRET=YOUR_TEST_SECRET
```

> Never commit real credentials or secrets.

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Start backend

```bash
python -m uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### 7. Start Ollama

```bash
ollama pull llama3.2:3b
ollama pull nomic-embed-text
ollama serve
```

### 8. Frontend

```bash
cd frontend
npm install
npm run dev
```

Example `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Frontend:

```text
http://localhost:3000
```

---

## 🔌 API Areas

```text
/api/v1/auth
/api/v1/merchant/products
/api/v1/merchant/boosts
/api/v1/merchant/growth
/api/v1/merchant/reports/sales
/api/v1/marketplace/products
/api/v1/customer/cart
/api/v1/ai
```

---

## 📊 Sales Report API

Example:

```http
GET /api/v1/merchant/reports/sales?period=monthly
```

Supported periods:

```text
daily
weekly
monthly
quarterly
```

---

## 🧪 Recommended Demo Flow

```text
1. Merchant logs in
2. Merchant views inventory
3. Growth Agent detects a slow-moving product
4. Merchant activates a product boost
5. Customer enters a natural-language query
6. AI Shopping Agent ranks relevant products
7. Relevant boosted product gets higher visibility
8. Customer adds product to cart
9. Razorpay checkout completes
10. Backend verifies payment
11. Inventory decreases
12. Order becomes PAID
13. Merchant analytics update
14. Growth Agent receives updated commerce data
```

This demonstrates the complete **agentic commerce loop** instead of disconnected AI features.

---

## 🛡️ Design Principles

### Relevance Before Promotion

```text
Promotion ≠ Relevance
```

### Verified Data Before AI Explanation

```text
PostgreSQL Analytics
        ↓
Verified Numbers
        ↓
Growth Agent Explanation
```

### Payment Before Fulfillment

```text
Payment Verification
        ↓
Inventory Mutation
        ↓
Order Fulfillment
```

### Tenant Isolation

Merchant-specific data stays scoped to the authenticated merchant.

---

## 🗺️ Roadmap

- product reviews and ratings
- personalized recommendations
- campaign analytics
- AI merchandising strategies
- customer order history
- improved refunds
- advanced category management
- multi-merchant order orchestration
- pgvector integration
- sales forecasting
- automated merchant reports
- notification agents
- production payment deployment

---

## 📸 Screenshots

Recommended structure:

```text
docs/
├── marketplace.png
├── ai-shopping.png
├── merchant-dashboard.png
├── growth-agent.png
├── sales-analytics.png
└── checkout.png
```

Then embed them with:

```markdown
![Marketplace](docs/marketplace.png)
```

---

## 🏆 Project Focus

Nexora Commerce explores the intersection of:

```text
AI Agents
+
E-Commerce
+
FinTech
+
Analytics
+
Full-Stack Engineering
```

The goal is not to add a chatbot to an online store.

The goal is to build a commerce system where **AI participates in product discovery, merchant decision-making, and the full post-payment feedback loop.**

---

## 👨‍💻 Author

**Sumit Helonde**

Computer Science & Business Systems  
AI/ML · Full-Stack · Agentic Systems

---

<div align="center">

## Nexora Commerce

**Discover intelligently. Sell strategically. Grow continuously.**

⭐ If you find this project interesting, consider starring the repository.

</div>
