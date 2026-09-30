// i18n.js - Clean, robust translations (en, hi, or)
const text = {
  en: {
    appName: 'Koraput Rain Advisor',
    govHeaderSub: 'Government of Odisha & Government of India',
    login: 'Login', register: 'Register', logout: 'Logout',
    farmerId: 'Farmer ID', name: 'Name', mobile: 'Mobile number', password: 'Password',
    block: 'Block', village: 'Village (Gram Panchayat)', select: 'Select', date: 'Date', show: 'Show rainfall', loading: 'Loading…',
    tab1: '1. Predicted Rainfall',
    tab2: '2. Weather & Rainfall Bar',
    tab3: '3. Best Crops to Grow',
    predTitle: 'Predicted rainfall',
    src_ai: 'AI village prediction',
    src_block_api: 'Block-level weather API estimate (village AI prediction not available)',
    weather: 'Weather', temp: 'Temperature', humidity: 'Humidity', dew: 'Dew point', prob: 'Chance of rain', blockRain: 'Block rainfall (API)',
    cond_clear: 'Clear', cond_cloudy: 'Cloudy', cond_rain: 'Rain', cond_storm: 'Thunderstorm',
    chart: 'Rainfall (mm): past 7 days and next 6 days',
    crops: 'Best crops to grow this month', week: 'Expected rain in next 7 days', water: 'Water need',
    water_low: 'Low', water_medium: 'Medium', water_high: 'High',
    cropsNote: 'This is a general suggestion, not guaranteed advice. Please ask your local agriculture office.',
    crop_rice: 'Rice', crop_ragi: 'Ragi (finger millet)', crop_maize: 'Maize', crop_arhar: 'Arhar (pigeon pea)', crop_ginger: 'Ginger',
    crop_mustard: 'Mustard', crop_potato: 'Potato', crop_vegetables: 'Vegetables', crop_groundnut: 'Groundnut',
    adv_very_heavy: 'Very heavy rain is expected in the next 3 days. Stay safe, protect your crops and keep animals on high ground.',
    adv_heavy: 'Heavy rain is expected in the next 3 days. Clear the drains in your field and postpone spraying.',
    adv_dry: 'Dry and hot days are coming. Water your crops in the morning or evening.',
    adv_ok: 'No weather warning. Good time for normal field work.',
    e_farmer_exists: 'This Farmer ID is already registered.',
    e_invalid_input: 'Please check your details. Mobile must be 10 digits and password at least 6 characters.',
    e_invalid_credentials: 'Wrong Farmer ID or password.',
    e_weather_unavailable: 'Weather service is not reachable right now. Please try again in a few minutes.',
    e_generic: 'Something went wrong. Please try again.'
  },
  hi: {
    appName: 'कोरापुट वर्षा सलाहकार',
    govHeaderSub: 'ओडिशा सरकार एवं भारत सरकार',
    login: 'लॉगिन', register: 'रजिस्टर करें', logout: 'लॉगआउट',
    farmerId: 'किसान आईडी', name: 'नाम', mobile: 'मोबाइल नंबर', password: 'पासवर्ड',
    block: 'ब्लॉक', village: 'गाँव (ग्राम पंचायत)', select: 'चुनें', date: 'तारीख', show: 'बारिश देखें', loading: 'लोड हो रहा है…',
    tab1: '1. अनुमानित बारिश',
    tab2: '2. मौसम और वर्षा ग्राफ',
    tab3: '3. इस महीने की अच्छी फसलें',
    predTitle: 'अनुमानित बारिश',
    src_ai: 'एआई द्वारा गाँव का पूर्वानुमान',
    src_block_api: 'ब्लॉक स्तर का मौसम API अनुमान (गाँव का एआई पूर्वानुमान उपलब्ध नहीं)',
    weather: 'मौसम', temp: 'तापमान', humidity: 'नमी', dew: 'ओस बिंदु', prob: 'बारिश की संभावना', blockRain: 'ब्लॉक की बारिश (API)',
    cond_clear: 'साफ़ मौसम', cond_cloudy: 'बादल', cond_rain: 'बारिश', cond_storm: 'गरज के साथ बारिश',
    chart: 'बारिश (मिमी): पिछले 7 दिन और अगले 6 दिन',
    crops: 'इस महीने उगाने के लिए अच्छी फसलें', week: 'अगले 7 दिनों में अनुमानित बारिश', water: 'पानी की ज़रूरत',
    water_low: 'कम', water_medium: 'मध्यम', water_high: 'ज़्यादा',
    cropsNote: 'यह सिर्फ़ सामान्य सुझाव है, पक्की सलाह नहीं। कृपया अपने कृषि कार्यालय से पूछें।',
    crop_rice: 'धान', crop_ragi: 'रागी (मंडुआ)', crop_maize: 'मक्का', crop_arhar: 'अरहर', crop_ginger: 'अदरक',
    crop_mustard: 'सरसों', crop_potato: 'आलू', crop_vegetables: 'सब्ज़ियाँ', crop_groundnut: 'मूँगफली',
    adv_very_heavy: 'अगले 3 दिनों में बहुत भारी बारिश का अनुमान है। सुरक्षित रहें, फसल बचाएँ और पशुओं को ऊँची जगह पर रखें।',
    adv_heavy: 'अगले 3 दिनों में भारी बारिश का अनुमान है। खेत की नालियाँ साफ़ रखें और छिड़काव टाल दें।',
    adv_dry: 'आगे सूखे और गर्म दिन हैं। सुबह या शाम को फसल की सिंचाई करें।',
    adv_ok: 'कोई मौसम चेतावनी नहीं है। खेत का सामान्य काम करने का अच्छा समय है।',
    e_farmer_exists: 'यह किसान आईडी पहले से रजिस्टर है।',
    e_invalid_input: 'कृपया जानकारी जाँचें। मोबाइल नंबर 10 अंकों का और पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
    e_invalid_credentials: 'किसान आईडी या पासवर्ड गलत है।',
    e_weather_unavailable: 'अभी मौसम सेवा से जुड़ नहीं पा रहे हैं। कुछ देर बाद फिर कोशिश करें।',
    e_generic: 'कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।'
  },
  or: {
    appName: 'କୋରାପୁଟ ବର୍ଷା ସହାୟକ',
    govHeaderSub: 'ଓଡ଼ିଶା ସରକାର ଓ ଭାରତ ସରକାର',
    login: 'ଲଗଇନ୍', register: 'ପଞ୍ଜୀକରଣ', logout: 'ଲଗଆଉଟ୍',
    farmerId: 'କୃଷକ ଆଇଡି', name: 'ନାମ', mobile: 'ମୋବାଇଲ ନମ୍ବର', password: 'ପାସୱାର୍ଡ',
    block: 'ବ୍ଲକ୍', village: 'ଗାଁ (ଗ୍ରାମ ପଞ୍ଚାୟତ)', select: 'ବାଛନ୍ତୁ', date: 'ତାରିଖ', show: 'ବର୍ଷା ଦେଖନ୍ତୁ', loading: 'ଲୋଡ୍ ହେଉଛି…',
    tab1: '୧. ଆନୁମାନିକ ବର୍ଷା',
    tab2: '୨. ପାଣିପାଗ ଓ ବର୍ଷା ଗ୍ରାଫ୍',
    tab3: '୩. ଚାଷ ପାଇଁ ଭଲ ଫସଲ',
    predTitle: 'ଆନୁମାନିକ ବର୍ଷା',
    src_ai: 'ଏଆଇ ଦ୍ୱାରା ଗାଁର ପୂର୍ବାନୁମାନ',
    src_block_api: 'ବ୍ଲକ୍ ସ୍ତରର ପାଣିପାଗ API ଅନୁମାନ (ଗାଁର ଏଆଇ ପୂର୍ବାନୁମାନ ମିଳୁନାହିଁ)',
    weather: 'ପାଣିପାଗ', temp: 'ତାପମାତ୍ରା', humidity: 'ଆର୍ଦ୍ରତା', dew: 'ଶିଶିର ବିନ୍ଦୁ', prob: 'ବର୍ଷାର ସମ୍ଭାବନା', blockRain: 'ବ୍ଲକ୍ ବର୍ଷା (API)',
    cond_clear: 'ଖରା ଓ ସଫା ଆକାଶ', cond_cloudy: 'ମେଘୁଆ', cond_rain: 'ବର୍ଷା', cond_storm: 'ବଜ୍ରପାତ ସହ ବର୍ଷା',
    chart: 'ବର୍ଷା (ମିମି): ଗତ ୭ ଦିନ ଓ ଆଗାମୀ ୬ ଦିନ',
    crops: 'ଏହି ମାସରେ ଚାଷ ପାଇଁ ଭଲ ଫସଲ', week: 'ଆଗାମୀ ୭ ଦିନରେ ଆନୁମାନିକ ବର୍ଷା', water: 'ପାଣିର ଆବଶ୍ୟକତା',
    water_low: 'କମ୍', water_medium: 'ମଧ୍ୟମ', water_high: 'ଅଧିକ',
    cropsNote: 'ଏହା କେବଳ ସାଧାରଣ ପରାମର୍ଶ, ନିଶ୍ଚିତ ପରାମର୍ଶ ନୁହେଁ। ଦୟାକରି ଆପଣଙ୍କ ସ୍ଥାନୀୟ କୃଷି ଅଫିସରେ ପଚାରନ୍ତୁ।',
    crop_rice: 'ଧାନ', crop_ragi: 'ମାଣ୍ଡିଆ', crop_maize: 'ମକା', crop_arhar: 'କନ୍ଦୁଲ', crop_ginger: 'ଅଦା',
    crop_mustard: 'ସୋରିଷ', crop_potato: 'ଆଳୁ', crop_vegetables: 'ପନିପରିବା', crop_groundnut: 'ଚିନାବାଦାମ',
    adv_very_heavy: 'ଆଗାମୀ ୩ ଦିନରେ ବହୁତ ଭାରି ବର୍ଷା ହେବାର ଆଶଙ୍କା ଅଛି। ସୁରକ୍ଷିତ ରୁହନ୍ତୁ, ଫସଲ ବଞ୍ଚାନ୍ତୁ ଓ ପଶୁମାନଙ୍କୁ ଉଚ୍ଚ ସ୍ଥାନରେ ରଖନ୍ତୁ।',
    adv_heavy: 'ଆଗାମୀ ୩ ଦିନରେ ଭାରି ବର୍ଷା ହେବାର ଆଶଙ୍କା ଅଛି। କ୍ଷେତର ନାଳ ସଫା ରଖନ୍ତୁ ଓ ଔଷଧ ସ୍ପ୍ରେ ପଛକୁ ପକାନ୍ତୁ।',
    adv_dry: 'ଆଗକୁ ଶୁଖିଲା ଓ ଗରମ ଦିନ ଆସୁଛି। ସକାଳେ କିମ୍ବା ସନ୍ଧ୍ୟାରେ ଫସଲରେ ପାଣି ଦିଅନ୍ତୁ।',
    adv_ok: 'କୌଣସି ପାଣିପାଗ ଚେତାବନୀ ନାହିଁ। ସାଧାରଣ କ୍ଷେତ କାମ ପାଇଁ ଭଲ ସମୟ।',
    e_farmer_exists: 'ଏହି କୃଷକ ଆଇଡି ପୂର୍ବରୁ ପଞ୍ଜୀକୃତ ହୋଇସାରିଛି।',
    e_invalid_input: 'ଦୟାକରି ବିବରଣୀ ଯାଞ୍ଚ କରନ୍ତୁ। ମୋବାଇଲ ନମ୍ବର ୧୦ ଅଙ୍କର ଓ ପାସୱାର୍ଡ ଅତି କମରେ ୬ ଅକ୍ଷରର ହେବା ଉଚିତ।',
    e_invalid_credentials: 'କୃଷକ ଆଇଡି କିମ୍ବା ପାସୱାର୍ଡ ଭୁଲ।',
    e_weather_unavailable: 'ବର୍ତ୍ତମାନ ପାଣିପାଗ ସେବା ମିଳୁନାହିଁ। ଦୟାକରି କିଛି ସମୟ ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
    e_generic: 'କିଛି ଭୁଲ ହୋଇଛି। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।'
  }
};

let lang = localStorage.getItem('lang') || 'en';
export const getLang = () => lang;
export const t = key => text[lang]?.[key] ?? text.en?.[key] ?? '';

export function setLang(l) {
  lang = text[l] ? l : 'en';
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  const sel = document.getElementById('lang');
  if (sel) sel.value = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => (el.textContent = t(el.dataset.i18n)));
}