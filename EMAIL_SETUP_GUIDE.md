# Návod: Nastavení Email Service pro "Hlídací pes"

Tento návod vás provede nastavením email service pro posílání notifikací o dostupnosti produktů.

## 🎯 Co potřebujete

Pro posílání emailů zákazníkům potřebujete email service. Doporučuji **Resend**, protože:
- ✅ Zdarma do 3000 emailů měsíčně
- ✅ Jednoduché nastavení
- ✅ Spolehlivé doručování
- ✅ Hezké email šablony

## 📋 Krok za krokem: Nastavení Resend

### Krok 1: Vytvoření účtu na Resend

1. Přejděte na: https://resend.com
2. Klikněte na "Sign Up" (zdarma)
3. Zaregistrujte se pomocí emailu nebo GitHub účtu

### Krok 2: Ověření domény (doporučeno)

**Pro produkční použití (doporučeno):**

1. V Resend Dashboard: Domains → Add Domain
2. Přidejte doménu: `fairybloom.cz`
3. Resend vám poskytne DNS záznamy, které musíte přidat:
   - Přejděte do vašeho DNS providera (kde máte nastavenou doménu)
   - Přidejte TXT záznamy, které Resend poskytl
   - Počkejte na ověření (obvykle několik minut)

**Pro testování (rychlé řešení):**

- Můžete použít Resend testovací doménu: `onboarding.resend.com`
- Ale emaily budou mít varování "via resend.dev"

### Krok 3: Získání API klíče

1. V Resend Dashboard: API Keys → Create API Key
2. Pojmenujte klíč (např. "FairyBloom Back in Stock")
3. Zkopírujte API klíč (ukáže se jen jednou!)

### Krok 4: Přidání API klíče do Vercel

1. Přejděte do Vercel Dashboard: https://vercel.com
2. Vyberte váš projekt
3. Settings → Environment Variables
4. Přidejte novou proměnnou:
   - **Name**: `RESEND_API_KEY`
   - **Value**: vložte API klíč z Resend
   - **Environment**: Production, Preview, Development (všechny)
5. Klikněte "Save"

### Krok 5: Redeploy projektu

1. V Vercel Dashboard: Deployments
2. Klikněte na tři tečky u posledního deploymentu
3. Vyberte "Redeploy"
4. Nebo pushněte změny do Git repozitáře (Vercel automaticky redeploy)

## ✅ Ověření, že to funguje

### Test 1: Zkontrolujte environment variable

1. V Vercel: Settings → Environment Variables
2. Ověřte, že `RESEND_API_KEY` je nastavená
3. Ověřte, že je aktivní pro Production

### Test 2: Test webhooku

1. V Shopify Admin změňte sklad produktu z 0 na více než 0
2. Zkontrolujte Vercel logs:
   - Vercel Dashboard → váš projekt → Logs
   - Měli byste vidět: `[BackInStock Webhook] Successfully sent email to [email]`
3. Zkontrolujte email zákazníka (včetně spam složky)

### Test 3: Zkontrolujte Resend Dashboard

1. V Resend Dashboard: Emails
2. Měli byste vidět seznam odeslaných emailů
3. Zkontrolujte status (Delivered, Bounced, atd.)

## 🔧 Alternativní email služby

Pokud nechcete používat Resend, můžete použít:

### SendGrid
- Zdarma do 100 emailů/den
- Nastavení: `SENDGRID_API_KEY`
- Upravte kód v `api/back-in-stock/webhook.js`

### Mailgun
- Zdarma do 5000 emailů/měsíc (první 3 měsíce)
- Nastavení: `MAILGUN_API_KEY` a `MAILGUN_DOMAIN`

### Shopify Email
- Prvních 10 000 emailů/měsíc zdarma
- Ale vyžaduje složitější integraci přes Shopify API

## ⚠️ Důležité poznámky

1. **Ověření domény je důležité** - Bez ověření domény mohou emaily končit ve spamu
2. **API klíč je citlivý** - Nikdy ho nesdílejte a nedávejte do kódu
3. **Limity** - Resend má limit 3000 emailů/měsíc zdarma, pak $20/měsíc
4. **Testování** - Vždy nejdřív otestujte na vlastním emailu

## 🐛 Troubleshooting

### Emaily nechodí

1. **Zkontrolujte Vercel logs** - Jsou tam chyby?
2. **Zkontrolujte Resend Dashboard** - Jsou emaily v seznamu?
3. **Zkontrolujte spam složku** - Emaily mohou končit ve spamu
4. **Zkontrolujte API klíč** - Je správně nastavený v Vercel?

### Chyba "Invalid API key"

- Zkontrolujte, že API klíč je správně zkopírovaný (bez mezer)
- Zkontrolujte, že je nastavený v správném prostředí (Production)
- Redeploy projekt

### Emaily končí ve spamu

- Ověřte doménu v Resend
- Přidejte SPF a DKIM záznamy do DNS
- Použijte ověřenou doménu místo testovací

## 📞 Podpora

- Resend dokumentace: https://resend.com/docs
- Resend support: support@resend.com
- Vercel dokumentace: https://vercel.com/docs

---

**Shrnutí:**
1. ✅ Vytvořte účet na Resend
2. ✅ Získejte API klíč
3. ✅ Přidejte `RESEND_API_KEY` do Vercel environment variables
4. ✅ Redeploy projekt
5. ✅ Otestujte

Hotovo! 🎉

