# Návod: Nastavení "Hlídací pes" (Back in Stock Notifications)

Tento návod vás provede nastavením systému pro notifikace o dostupnosti produktů.

## ✅ Co už je hotové v kódu

1. ✅ API endpoint pro přihlášení zákazníků: `/api/back-in-stock/subscribe`
2. ✅ API endpoint pro webhook: `/api/back-in-stock/webhook`
3. ✅ Frontend komponenta s tlačítkem "Hlídat dostupnost"
4. ✅ Integrace do stránek produktů

## 📋 Co musíte udělat v Shopify Admin

### Krok 1: Nastavení Webhooku v Shopify

1. **Přihlaste se do Shopify Admin**
   - Přejděte na: https://admin.shopify.com/store/[vaše-obchod]

2. **Přejděte do nastavení Webhooků**
   - Settings → Notifications
   - Nebo přímo: https://admin.shopify.com/store/[vaše-obchod]/settings/notifications

3. **Vytvořte nový Webhook**
   - Klikněte na "Create webhook" nebo "Add webhook"
   - Vyberte event: **"Inventory levels updated"**
   - Format: **JSON**
   - URL: `https://[vaše-doména]/api/back-in-stock/webhook`
     - Příklad: `https://fairybloom.cz/api/back-in-stock/webhook`
     - Nebo pro Vercel: `https://[vaše-projekt].vercel.app/api/back-in-stock/webhook`

4. **Uložte webhook**
   - Klikněte na "Save webhook"

### Krok 2: Ověření, že webhook funguje

1. **Test webhooku**
   - V Shopify Admin změňte sklad nějakého produktu z 0 na více než 0
   - Zkontrolujte v konzoli serveru (Vercel logs), zda webhook dorazil

2. **Kontrola v kódu**
   - Webhook endpoint loguje všechny příchozí webhooky do konzole
   - Zkontrolujte Vercel logs nebo server logs

## 🔧 Nastavení Email Service (volitelné, ale doporučeno)

Aktuálně webhook endpoint pouze loguje, že by měl poslat email. Pro skutečné posílání emailů potřebujete:

### Varianta A: Shopify Email API (doporučeno)

Shopify Email je integrováno v Shopify a první 10 000 emailů měsíčně je zdarma.

**Co je potřeba:**
- Aktivovat Shopify Email v Shopify Admin
- Upravit webhook endpoint pro použití Shopify Email API

**Návod:**
1. V Shopify Admin: Settings → Customer email
2. Aktivujte Shopify Email
3. Vytvořte email template pro "Back in Stock"
4. Upravte `api/back-in-stock/webhook.js` pro použití Shopify Email API

### Varianta B: Externí Email Service (Resend, SendGrid, atd.)

**Resend (doporučeno - zdarma do 3000 emailů/měsíc):**

1. Zaregistrujte se na https://resend.com
2. Získejte API klíč
3. Přidejte do environment variables: `RESEND_API_KEY`
4. Upravte `api/back-in-stock/webhook.js` pro použití Resend API

**Příklad kódu pro Resend:**
```javascript
if (emailApiKey) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${emailApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FairyBloom <noreply@fairybloom.cz>',
      to: customer.email,
      subject: `Produkt je opět skladem! - ${product.title}`,
      html: `
        <h1>Ahoj ${customer.first_name || 'zákazníku'},</h1>
        <p>Máme radostnou zprávu! Produkt, který jste si přál/a sledovat, je opět skladem:</p>
        <h2>${product.title}</h2>
        <p>Cena: ${variant.price.amount} ${variant.price.currencyCode}</p>
        <a href="${productUrl}">Zobrazit produkt</a>
      `
    })
  });
}
```

## 🧪 Testování

### 1. Test přihlášení zákazníka

1. Otevřete produkt, který není skladem
2. Klikněte na tlačítko "Hlídat dostupnost"
3. Zkontrolujte, že se zobrazí zpráva "Přihlášeno k notifikaci"
4. V Shopify Admin zkontrolujte, že zákazník má tag `back-in-stock-{variantId}`

### 2. Test webhooku

1. V Shopify Admin změňte sklad produktu z 0 na více než 0
2. Zkontrolujte Vercel logs, zda webhook dorazil
3. Zkontrolujte, zda webhook našel zákazníky s tagem
4. Pokud máte nastavený email service, zkontrolujte, zda email přišel

## 📝 Formát tagů

Zákazníci dostanou tag ve formátu:
- `back-in-stock-{variantId}`
- Příklad: `back-in-stock-123456789`

Tag se automaticky odstraní po odeslání notifikace.

## ⚠️ Důležité poznámky

1. **Zákazník musí být přihlášen** - Komponenta vyžaduje, aby zákazník byl přihlášen (má email)
2. **Email service je volitelný** - Bez email service webhook pouze loguje, že by měl poslat email
3. **Webhook musí být veřejně dostupný** - URL musí být přístupná z internetu (Vercel to zajišťuje automaticky)

## 🔍 Troubleshooting

### Webhook nedorazí
- Zkontrolujte, zda je URL správná a veřejně dostupná
- Zkontrolujte Vercel logs
- Zkontrolujte, zda Shopify webhook není pozastaven

### Zákazník nedostane email
- Zkontrolujte, zda máte nastavený email service
- Zkontrolujte, zda má zákazník správný tag
- Zkontrolujte server logs pro chyby

### Tag se nepřidá zákazníkovi
- Zkontrolujte, zda zákazník existuje v Shopify
- Zkontrolujte Shopify Admin API token
- Zkontrolujte server logs pro chyby

## 📞 Podpora

Pokud máte problémy, zkontrolujte:
1. Vercel logs pro chyby
2. Shopify Admin → Settings → Webhooks pro status webhooku
3. Shopify Admin → Customers pro kontrolu tagů zákazníků

