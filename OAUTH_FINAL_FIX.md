# OAuth Final Fix - Customer Account API URL

## 🔧 **Poslední oprava:**

### **Problém:**
- Customer Account API endpoint byla špatná URL
- Používali jsme: `https://ucet.fairybloom.cz/api/unstable/graphql`
- Shopify vrací 404 error

### **Řešení:**
- Opravená URL: `https://shopify.com/93997105496/account/customer/api/unstable/graphql`
- Používá Shop ID místo custom domain

## 📝 **Změněné soubory:**

### 1. **`api/auth/customer.js`**
- Změněna URL na `https://shopify.com/${shopId}/account/customer/api/unstable/graphql`
- Přidán debug logging
- Zlepšené error handling

### 2. **`src/lib/customerAccountApi.ts`**
- Aktualizována URL pro frontend
- Používá stejnou URL jako backend

## ✅ **Co by mělo nyní fungovat:**

1. **OAuth přihlášení** ✅
   - Popup se otevře
   - Přihlášení v Shopify
   - Token se uloží

2. **Načtení zákaznických dat** ✅
   - Backend volá správnou API URL
   - Zákaznická data se načítají
   - Ikona v navigaci ukazuje přihlášení

3. **Automatické přihlášení na checkout** ✅
   - Token v cookies funguje na subdoménách
   - `pokladna.fairybloom.cz` vidí přihlášení

## 🚀 **Nasazení:**

1. **Push změny:**
   ```bash
   git add .
   git commit -m "Fix Customer Account API URL"
   git push
   ```

2. **Testujte po deployi:**
   - Přihlaste se přes Shopify
   - Zkontrolujte, jestli vidíte své jméno v navigaci
   - Jděte do košíku a zkontrolujte auto-fill údajů

## 🔍 **Debug:**

Pokud stále nefunguje, zkontrolujte **Vercel Logs**:
- Měli byste vidět: `Fetching customer from: https://shopify.com/93997105496/account/customer/api/unstable/graphql`
- **NE** 404 error

## 📋 **DNS nastavení:**

✅ **`ucet.fairybloom.cz`** je nastavené správně
- CNAME: `ucet.fairybloom.cz` → `shops.myshopify.com`
- Redirect funguje na: `https://shopify.com/93997105496/account/orders`

## 🎯 **Poznámky:**

- Customer Account API používá **Shop ID** v URL, ne custom domain
- Custom domain (`ucet.fairybloom.cz`) je jen pro zákaznické rozhraní, ne pro API
- API endpoint je vždy: `https://shopify.com/{SHOP_ID}/account/customer/api/unstable/graphql`
