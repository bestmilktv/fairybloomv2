# OAuth Opravy - Changelog

## 🔧 Provedené opravy

### 1. **CORS Error opraveno**
- **Problém:** Frontend volal `ucet.fairybloom.cz` přímo, což způsobovalo CORS error
- **Řešení:** Frontend nyní volá `/api/auth/customer` endpoint (backend), který pak komunikuje s Customer Account API
- **Soubory:** `src/lib/customerAccountApi.ts`

### 2. **OAuth Callback opraveno**
- **Problém:** State a code_verifier byly v sessionStorage, což nefungovalo mezi popup oknem a hlavním oknem
- **Řešení:** Vytvořen `/api/auth/init` endpoint, který ukládá parametry do HTTP-only cookies
- **Soubory:** `api/auth/init.js`, `api/auth/callback.js`, `src/lib/oauth.ts`

### 3. **PostMessage komunikace**
- **Problém:** Popup okno se zavíralo, ale token se nepřenášel zpět
- **Řešení:** Callback endpoint nyní posílá správnou postMessage do parent okna
- **Soubory:** `api/auth/callback.js`

## 📋 Co se změnilo

### Backend endpoints:

#### **Nový:** `/api/auth/init` (POST)
```javascript
// Ukládá state a code_verifier do cookies
{
  "state": "random_state",
  "codeVerifier": "random_verifier"
}
```

#### **Upravený:** `/api/auth/callback` (GET)
- Čte state a code_verifier z cookies (ne z sessionStorage)
- Posílá postMessage do parent okna po úspěšné autentizaci

#### **Upravený:** `/api/auth/customer` (GET)
- Používá `ucet.fairybloom.cz` pro Customer Account API

### Frontend:

#### **`src/lib/customerAccountApi.ts`**
- `fetchCustomerProfile()` volá `/api/auth/customer` místo přímého volání Customer Account API
- `isCustomerAuthenticated()` pouze kontroluje HTTP status

#### **`src/lib/oauth.ts`**
- Před otevřením popup okna volá `/api/auth/init` pro uložení parametrů
- Odstraněn sessionStorage (nefungoval mezi okny)

## ✅ Co by mělo nyní fungovat

1. **Přihlášení:**
   - Kliknutím na "Přihlásit se přes Shopify" se otevře popup
   - Po úspěšném přihlášení v Shopify se popup zavře
   - Hlavní okno dostane token a načte zákaznická data

2. **Žádné CORS errory:**
   - Frontend nevolá Customer Account API přímo
   - Všechny requesty jdou přes backend endpoints

3. **Session persistence:**
   - Token je v HTTP-only cookie
   - Cookie funguje na `fairybloom.cz` i `pokladna.fairybloom.cz`

## 🚀 Nasazení

1. **Push změny do GitHub**
2. **Vercel automaticky deploy**
3. **Testujte OAuth flow**

## 🔍 Debug

Pokud stále nefunguje, zkontrolujte v Console:

1. **CORS errory** - měly by být pryč
2. **OAuth flow** - popup by se měl otevřít a po přihlášení zavřít
3. **Token transfer** - měla by se zobrazit zpráva o úspěšném přihlášení

## 📝 Poznámky

- **Cookies:** State a code_verifier jsou nyní v HTTP-only cookies (bezpečnější)
- **PKCE:** Stále funguje, ale s cookies místo sessionStorage
- **Public Client:** Shopify Headless app jako Public Client nefunguje bez správně nakonfigurovaných scopes
