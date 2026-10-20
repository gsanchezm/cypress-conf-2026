# cypress-conf-2026

<p align="center">
  <strong>Cypress के लिए एटॉमिक टेस्टिंग आर्किटेक्चर — API, Web और AI एजेंट्स</strong><br />
  स्वतंत्र रूप से परिनियोजित वास्तविक मल्टी-मार्केट सिस्टम: <a href="https://gsanchezm.github.io/OmniPizza/">OmniPizza</a>
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> ·
  <a href="README_ES.md"><strong>Español</strong></a> ·
  <a href="README_DE.md"><strong>Deutsch</strong></a> ·
  <a href="README_ZH.md"><strong>简体中文</strong></a> ·
  <a href="README_HI.md"><strong>हिन्दी</strong></a>
</p>

---

## 🌟 प्रोजेक्ट का संक्षिप्त विवरण (Overview)

**cypress-conf-2026** एक एंड-टू-एंड एटॉमिक टेस्टिंग आर्किटेक्चर प्रस्तुत करता है जो तीन प्रमुख स्तंभों पर आधारित है:
1. **एटॉमिक परिदृश्य (Atomic Scenarios):** API के माध्यम से डेटा/स्टेट का त्वरित इंजेक्शन (Hydration) और उसके बाद केवल लक्षित UI क्रिया का सत्यापन।
2. **AI एजेंट गवर्नेंस (AI Agent Governance):** निर्धारित सुरक्षा हुक (Hooks) जो AI एजेंट्स को परीक्षण अनुबंधों या दावों (Assertions) को बदलने से रोकते हैं।
3. **एंटरप्राइज ऑब्जर्वेबिलिटी (Enterprise Observability):** **TestRail** (बल्क HTTP अनुरोधों में) और **Cypress Cloud CLI** के साथ स्वायत्त CI ट्राइएज रिपोर्टिंग।

### 🍕 टेस्ट के तहत सिस्टम (SUT): OmniPizza
स्वचालित परीक्षण के लिए विशेष रूप से निर्मित एक संपूर्ण प्रोडक्शन-ग्रेड प्लेटफ़ॉर्म:
- **वेब एप्लिकेशन:** [omnipizza-frontend.onrender.com](https://omnipizza-frontend.onrender.com)
- **API (OpenAPI 3.1):** [omnipizza-backend.onrender.com/api/docs](https://omnipizza-backend.onrender.com/api/docs)
- **5 क्षेत्रीय बाज़ार (Markets):** 🇺🇸 US (ज़िप कोड) · 🇲🇽 MX (कॉलोनिया) · 🇨🇭 CH (पोस्टल कोड) · 🇯🇵 JP (प्रान्त/Prefecture) · 🇸🇦 SA (ज़िला/District, RTL अरबी लेआउट)।
- **सेटअप एंडपॉइंट्स:** `(atomic test setup)` टैग वाले एंडपॉइंट्स मिलीसेकंड में HTTP के जरिए यूज़र सेशन और कार्ट डेटा तैयार करते हैं।

---

## 📐 एटॉमिक टेस्टिंग आर्किटेक्चर (Atomic Testing Architecture)

UI में कई स्क्रीनों से होकर गुजरने वाली धीमी और अस्थिर यात्राओं (Login ➔ Catalog ➔ Cart ➔ Checkout) के बजाय, प्रत्येक टेस्ट `AtomicScenario` के **Template Method** पैटर्न का पालन करता है:

```text
1. arrangeViaApi()  ➔ वास्तविक HTTP अनुरोधों द्वारा स्टेट तैयार करना और API कॉन्ट्रैक्ट जाँचना।
        ⬇
2. hydrateUi()      ➔ ब्राउज़र में स्टेट इंजेक्ट करना (Session/localStorage) और केवल लक्षित क्रिया निष्पादित करना।
        ⬇
3. assertUi()       ➔ रेंडर किए गए DOM पर केवल एक अंतिम सत्यापन।
```

### असर्शन बजट नियम (Assertion Budget): अधिकतम 2 असर्शन
- **1 API दावा (Claim):** बिज़नेस लॉजिक और कॉन्ट्रैक्ट की पुष्टि करता है (उदा. HTTP 201 Created)।
- **1 UI दावा (Claim):** स्क्रीन पर रेंडर परिणाम की पुष्टि करता है (उदा. फॉर्मेटेड कुल राशि API के मान से हूबहू मेल खाती है)।
- **प्री-कंडीशन और गार्ड्स (Preconditions & Guards):** बुनियादी ढाँचा सत्यापन (`precondition()`) और DOM लोडिंग प्रतीक्षा (`.should('be.visible')`) बजट में **नहीं** गिने जाते; असफल होने पर ये `PreconditionError` थ्रो करते हैं।

---

## 🤖 एजेंट इकोसिस्टम और सुरक्षा हुक्स (Safety Hooks)

यह रिपॉजिटरी स्वायत्त एजेंट्स (Claude Code, Codex, Copilot, DeepSeek) द्वारा सुरक्षित रूप से संचालित होने के लिए डिज़ाइन की गई है:

| घटक | भूमिका | तंत्र (Mechanism) |
|---|---|---|
| **`AGENTS.md`** | रिपॉजिटरी का संविधान | सख्त कोडिंग स्टाइल, केवल pnpm का नियम, और वर्जित क्रियाएँ। |
| **`guard-oracle.ts`** | ओरेकल सुरक्षा हुक | `.feature` फ़ाइलों और `assert*` विधियों में संपादन को रोकता है (Exit 2)। |
| **`guard-bash.ts`** | कमांड सुरक्षा हुक | अनधिकृत `--record`, `cyPrompt`, और `git push` को अस्वीकार करता है। |
| **`cypress-tap`** | लाइव एजेंट फीडबैक | सब-एजेंट `cy-fixer` `cypress open` के ज़रिए वास्तविक DOM स्नैपशॉट की जाँच करता है। |
| **`cypress-cloud-cli`** | क्लाउड निरीक्षण | सब-एजेंट `cy-triage` `cy-cloud` द्वारा रन इतिहास और टाइमलाइन की जाँच करता है। |
| **Graphify** | स्थानीय कोड नॉलेज ग्राफ | बिना LLM API टोकन खर्च किए 630+ सिंबल्स और निर्भरताओं का ग्राफ तैयार करता है। |

---

## 🛡️ स्व-उपचार (Self-Healing) के तीन स्तर ("Ring Check")

जब एप्लिकेशन में कोई बदलाव DOM को बदल देता है (जैसे `MUTATE_DOM=checkout.address` द्वारा `data-testid` का नाम बदलना):

1. **A11y एक्सेसिबिलिटी फॉलबैक्स (`HEAL_LOCATORS=a11y`):** तत्काल, $0 लागत, शून्य LLM। पहले से एकत्रित स्तरों (`id` ➔ `name` ➔ `aria-label` ➔ `placeholder`) द्वारा ठीक करता है। यह RTL अरबी लेआउट में भी काम करता है।
2. **AI एजेंट द्वारा मरम्मत (`cy-fixer`):** `cypress tap` से त्रुटिपूर्ण DOM देखकर अधिकतम 5 प्रयासों में `locators/*.json` को स्वायत्त रूप से सुधारता है।
3. **AI सिमेंटिक टेस्टिंग (`UI_STRATEGY=cyPrompt`):** Markdown फ़ाइल (`checkout.prompt.md`) में लिखे सामान्य भाषा के निर्देशों को सीधे स्क्रीन पर रेंडर किए गए सिमेंटिक्स से समझकर निष्पादित करता है।

---

## 📊 एंटरप्राइज ऑब्जर्वेबिलिटी (Observability)

### TestRail बल्क इंटीग्रेशन
- Cypress के `after:run` इवेंट से जुड़ा कस्टम `TestRailObserver`।
- केवल **तीन बल्क HTTP अनुरोधों** में संपूर्ण टेस्ट सूट की रिपोर्ट दर्ज करता है (180 अनुरोध/मिनट की सीमा का सम्मान करते हुए)।
- TestRail नेटवर्क समस्या कभी भी सफल टेस्ट रन को लाल (Failed) नहीं बनाती।

### Cypress Cloud CLI और स्वायत्त CI
- **स्थानीय टर्मिनल निरीक्षण:** `pnpm cloud:runs` और `cy-cloud` द्वारा विफलताओं और रीप्ले की तुरंत जाँच करें।
- **स्वायत्त CI ट्राइएज (`ci-triage.yml`):** CI विफलता पर एजेंट स्वचालित रूप से विश्लेषण करता है। यदि समस्या किसी क्षणिक `flake` या सर्वर `cold_start` के कारण है (आत्मविश्वास ≥ 0.7), तो यह बिना मानवीय हस्तक्षेप के स्वचालित रूप से री-रन ट्रिगर करता है।

---

## 🚀 त्वरित शुरुआत (Quickstart Commands)

```bash
# 1. निर्भरताएँ (Dependencies) स्थापित करें
pnpm install

# 2. बैकएंड सेवाओं को सक्रिय करें (Render free-tier वॉर्मअप)
pnpm warmup

# 3. टाइपचेक करें और टेस्ट चलाएं
pnpm typecheck
pnpm cy:run --browser chrome --spec cypress/e2e/checkout/checkout.feature

# 4. लाइव सेल्फ-हीलिंग डेमो चलाएं (A11y फॉलबैक्स)
pnpm exec cypress run --browser chrome --spec cypress/e2e/checkout/checkout.feature \
  --expose MUTATE_DOM=checkout.address,HEAL_LOCATORS=a11y --config retries=0

# 5. Cypress Cloud CLI स्थिति की जाँच करें
pnpm cloud:status
pnpm cloud:runs
```

---

## 📄 लाइसेंस (License)
ISC © [Gilberto Sánchez (Mexitester)](https://linkedin.com/in/gilberto-sanchez-mares)
