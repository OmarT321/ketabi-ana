export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(
      /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\u200b-\u200f\u202a-\u202e\ufeff]/g,
      "",
    )
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const directCrisisPatterns = [
  /بنتحر|بانتحر|رح انتحر|راح انتحر|اخلص من نفسي/,
  /ودي (اموت|موت)|نفسي اموت|ما ودي اعيش|اتمني ما اصحي|اتمني (اني )?ما (اصحي|اصحا)|مش عايز اعيش|مش عاوز اعيش/,
  /اقتلهم|اذيهم|اوذيهم|هقتل نفسي|هقتلهم|هنتحر|حنتحر/,
  /انتحر|انتحار|اذي نفسي|شرايين|خلاص من الحياه|اختفي للابد|احد يوذيني|احد يضربني|تعرضت لاعتداء|تعرضت للاعتداء|تعرضت لايذاء/,
  /انتح[ارر]/,
  /اقتل نفسي|قتل نفسي|اذي نفسي|اوذي نفسي|ايذاء نفسي|اجرح نفسي|[بهح](?:جرح|اذي|وذي|قتل) نفسي|اقطع شراييني|اذبح نفسي/,
  /(?:اذيت|اوذيت|جرحت|قطعت|حرقت|طعنت) نفسي|يعنفني|عنفني|هددني (?:بالقتل|بالضرب|بالموت)|يهددني (?:بالقتل|بالضرب|بالموت)/,
  /انهي حياتي|انهاء حياتي|اخلص من حياتي|اتخلص من حياتي|احرق نفسي|ارمي نفسي|اشنق نفسي/,
  /ما (?:عاد )?(ابي|ابغي|بدي|اريد) اعيش|مش (عايز|عاوزه|عاوز) اعيش|لم اعد اريد (ان )?اعيش/,
  /ابي اموت|ابغي اموت|بدي (?:اموت|موت)|عايز اموت|عاوز اموت|عاوزه اموت|اريد (ان )?اموت|اتمني (الموت|اموت)|قررت (اني |ان )?اموت|احاول (اني |ان )?اموت/,
  /الحياه (ما لها|مالها|بلا) معني|ما عاد في امل|لا امل في الحياه|الموت افضل/,
  /جرع(?:ه|ات) زايده|بلعت (حبوب|ادويه)|اخذت (كل|كثير من) (الحبوب|الادويه)/,
  /(?:ما|لا) (?:احد|حد|شخص) (?:يحميني|يساعدني) من (?:الضرب|العنف|الاعتداء|الايذاء)|(?:اتعرض|تعرضت) (?:للضرب|للعنف|للتحرش)|يضربني|ضربني|يصفعني|صفعني|يعتدي علي|اعتدي علي/,
  /(?:اخاف|اخشي|خايف|خائف|خايفه|خائفه) (?:ان |انه )?(?:يقتلني|يذبحني|يطعنني|يقتلوني)|(?:زوجي|زوجتي|ابي|امي|اخي|اختي|مديري|جاري|شخص|احد) (?:سيقتلني|يريد قتلي|يحاول قتلي)|(?:يقتلني|سيقتلني|يطعنني) (?:زوجي|زوجتي|ابي|امي|اخي|اختي|مديري|جاري|شخص|احد)/,
  /اقتل (شخص|احد|فلان)|اوذي شخص|اذي شخص/,
  /\b(?:suicid\w*|selfharm|overdose)\b|\b(?:kill myself|end my life|hurt myself|self harm|cut myself|want to die|don t want to live|unalive myself)\b/,
  /\b(?:will|want to|going to|plan to|planning to) (?:kill|hurt|harm) (?:myself|him|her|them|someone|somebody|people|a person)\b/,
  /مش عايز اصحي|ما ابي اصحي|اخر يوم لي|اودع الحياه|بختفي للابد|سوف اموت الليله/,
  /(?:^| )[وف]?(?:س)?اموت (?:الليله|اليوم|الان)(?: |$)|(?:لا|لم اعد) استطيع (?:الاستمرار|اكمل|المواصله) في الحياه/,
];

const intendedHarmPatterns = [
  /(?:^| )[وف]?(?:(?:اريد|ابي|ابغي|ودي|بدي|ناوي|ناويه|انوي|قررت|اخطط|عايز|عاوز|عاوزه) (?:ان |اني )?(?:اقتل|اذبح|اطعن|اوذي|اذي)|ساقتل|ساذبح|ساطعن|راح اقتل|رح اقتل)(?= |$)/g,
  /\b(?:will|want to|going to|plan to|planning to) (?:kill|hurt|harm|stab|shoot)\b/g,
];
const routineHarmObject =
  /^(?: (?:هذا|هذه|هذي))* (?:ال)?(?:وقت|انتظار|ملل|عمليه|برنامج|تطبيق|خادم|اتصال|جلسه|خدمه)(?: |$)|^ (?:my |our |the |this |a |an )?(?:stuck |frozen |hung |zombie )?(?:process|app|application|program|server|thread|container|task|session|connection|service|computer|phone|device|time|boredom)(?: |$)/;

function hasIntendedHarm(text: string): boolean {
  for (const pattern of intendedHarmPatterns) {
    for (const match of text.matchAll(pattern)) {
      const prefix = text.slice(0, match.index).trimEnd();
      const suffix = text.slice(match.index + match[0].length);
      const locallyDenied =
        /(?:^| )(?:لا|لن|ما|مو|مش|ماني|not|never|don t)(?: عاد)?$/.test(prefix);
      if (locallyDenied && !/(?:^| )(?:الا|سوي|except)(?: |$)/.test(suffix))
        continue;
      // Intent + a target can name a person rather than a small pronoun list.
      // Only a locally identified technical/time object is exempted. A second
      // independent threat in the message is still checked by this loop.
      if (!routineHarmObject.test(suffix)) return true;
    }
  }
  return false;
}

// “I cannot finish my homework” is not the same signal as an unqualified
// “I cannot go on”. Only an immediately attached ordinary task is exempted;
// any independent direct harm signal above always takes precedence.
const cannotContinue = /(?:مش قادر|مو قادر|ما اقدر) اكمل(?= |$)/g;
const ordinaryTask =
  /^(?: (?:هذا|هذه|هذي|هالمشروع|هالمهمه|باقي|كل))* (?:المشروع|مشروعي|مشروع|المهمه|مهمتي|المهام|مهامي|العمل|عملي|الشغل|شغلي|الواجب|واجبي|واجباتي|الدراسه|دراستي|الدرس|درسي|المذاكره|مذاكرتي|الاختبار|اختباري|الامتحان|امتحاني|التمرين|تمريني|التقرير|تقريري|الكتاب|كتابي|اللعبه|لعبتي)(?: |$)/;
const ordinaryEnglishTask =
  /^(?: with)? (?:my |the |this |that )?(?:project|homework|assignment|task|work|exam|test|report|exercise|game|book)(?: |$)/;

function safetyEvidence(text: string): string {
  // Remove complete, explicit denials only: a nearby "not" never exempts an
  // entire message. A second desire, plan, injury or overdose stays visible.
  return (
    text
      .replace(
        /(?:^| )[وف]?(?:لا|ما|مو|مش|ماني) (?:اريد|ابي|ابغي|بدي|عايز|عاوز|عاوزه|ناوي|ناويه|انوي) (?:ان |اني )?(?:اموت|الموت|انتحر|الانتحار|ايذاء نفسي|اذي نفسي|اوذي نفسي|اجرح نفسي|اقتل نفسي|قتل نفسي|جرح نفسي)(?= |$)(?! (?:الا|سوي)(?: |$))/g,
        " ",
      )
      .replace(
        /(?:^| )[وف]?(?:لا|لم|ما|مو|مش|ماني) افكر (?:في |ب)(?:الانتحار|ايذاء نفسي|قتل نفسي)(?= |$)(?! (?:الا|سوي)(?: |$))/g,
        " ",
      )
      .replace(
        /(?:^| )[وف]?(?:لا|ما|مو|مش) (?:احد|حد|شخص) (?:يضربني|يوذيني|يعتدي علي)(?= |$)(?! (?:الا|سوي)(?: |$))/g,
        " ",
      )
      .replace(
        /(?:^| )[وف]?(?:لا|لن|لم) (?:انتحر|اذي نفسي|اوذي نفسي|اقتل نفسي|اجرح نفسي|احرق نفسي|ارمي نفسي|اشنق نفسي|اذبح نفسي|اقطع شراييني|انهي حياتي)(?= |$)(?! (?:الا|سوي)(?: |$))/g,
        " ",
      )
      .replace(
        /(?:^| )[وف]?(?:لا|لم|ما) (?:يضربني|يوذيني|يصفعني|يعنفني|يعتدي علي|يهددني (?:بالقتل|بالضرب|بالموت))(?= |$)(?!(?: (?:زوجي|زوجتي|ابي|امي|اخي|اختي|مديري|جاري|شخص|احد))? (?:الا|سوي)(?: |$))/g,
        " ",
      )
      // Only the locally named inanimate subject is figurative. A person's
      // statement elsewhere in the same sentence is checked independently.
      .replace(
        /(?:^| )[وف]?(?:جهازي|الجهاز|هاتفي|الهاتف|جوالي|الجوال|اللابتوب|الكمبيوتر|الحاسوب|التطبيق|البرنامج|البطاريه)(?: (?:الجديد|القديم))? (?:انتحر|انتحرت|بينتحر)(?= |$)/g,
        " ",
      )
      .replace(/(?:^| )اموت (?:الليله |اليوم |الان )?من الضحك(?= |$)/g, " ")
      .trim()
  );
}

export function isCrisis(text: string) {
  const n = safetyEvidence(normalize(text));
  if (directCrisisPatterns.some((p) => p.test(n))) return true;
  if (hasIntendedHarm(n)) return true;
  if (/^(?:اموت|انهيها)$/.test(n)) return true;
  for (const match of n.matchAll(cannotContinue)) {
    const suffix = n.slice(match.index + match[0].length);
    if (
      !ordinaryTask.test(suffix) ||
      /(?:ولا|او|وحتي) (?:حتي )?حياتي(?: |$)/.test(suffix)
    )
      return true;
  }
  for (const match of n.matchAll(/\b(?:cannot|can t) go on\b/g)) {
    const suffix = n.slice(match.index + match[0].length);
    if (
      !ordinaryEnglishTask.test(suffix) ||
      /\b(?:or|and) (?:my )?life\b/.test(suffix)
    )
      return true;
  }
  return false;
}
export function isRestricted(text: string) {
  // Denying a request for a ruling is not requesting one. Mask only that
  // explicit span; a later actual ruling or override request still wins.
  const n = normalize(text).replace(
    /(?:^| )[وف]?(?:لا|ما|مو|مش|ماني) (?:ابحث عن|اريد|اطلب|ابي|ابغي|احتاج) (?:فتوي|فتاوي)(?= |$)/g,
    " ",
  );
  const legalRequest =
    /(?:^| )(?:افتني|افتي|فتوي|فتاوي|تكفير)(?: |$)|(?:^| )(?:ما|وش|ايش) (?:هو |هي )?حكم(?: |$)|(?:^| )(?:اعطني|اريد|ابي|ابغي|عايز|عاوز|احتاج|وضح)(?: \S+){0,3} (?:حكما?|الحكم)(?: |$)|^(?:حلال|حرام|يجوز)(?: |$)|^حكم (?!علي(?:نا|ه|ها|هم)?(?: |$))|(?:^| )هل(?: \S+){0,6} (?:يجوز|حلال|حرام|كافر|طالق)(?: |$)|(?:^| )(?:حلال|حرام) (?:ام|او)(?: |$)|حكمه الشرعي/;
  const inventedOrInterpretedScripture =
    /(?:^| )[وف]?(?:اكتب|الف|اختلق|اخترع)(?: \S+){0,6} (?:ال)?(?:ايه|ايات|حديثا?|قرانا?|دعاء)(?: |$)|(?:^| )[وف]?(?:فسر|تفسير)(?: \S+){0,6} (?:ال)?(?:ايه|ايات|سوره|قران|حديث)(?: |$)/;
  const divinePromise = /يضمن الله|سيضمن|هل الله.*(?:يحبني|يعاقبني|ينجحني)/;
  const overrideRequest =
    /(?:^| )[وف]?(?:تجاهل|اتجاهل|اهمل|انس|تخط|تجاوز|غير)(?: \S+){0,4} (?:التعليمات|تعليمات|تعليماتك|القواعد|قواعدك|النظام|البرومبت|برومبت)(?: |$)|(?:^| )[وف]?(?:اظهر|اكشف|اعرض|اطبع)(?: \S+){0,4} (?:تعليماتك|البرومبت|برومبت|التعليمات)(?: |$)|\b(?:ignore|override|disregard|bypass)(?: \w+){0,5} (?:instructions?|rules?|system|prompt|polic(?:y|ies))\b|\b(?:invent|fabricate)(?: \w+){0,5} (?:verse|hadith|scripture)\b|\b(?:system prompt|system instructions)\b/;
  const englishLegalRequest =
    /\b(?:fatwa|takfir)\b|\b(?:is|are|can|may|should|what)(?: \w+){0,8} (?:halal|haram)\b|^(?:halal|haram)\b/;
  return [
    legalRequest,
    inventedOrInterpretedScripture,
    divinePromise,
    overrideRequest,
    englishLegalRequest,
  ].some((pattern) => pattern.test(n));
}
export const crisisMessage =
  "يبدو أن ما تمرّ به يحتاج إلى دعم بشري مباشر. إذا كنت في خطر الآن أو تخشى أن تؤذي نفسك أو غيرك، اتصل بالطوارئ المحلية أو توجّه إلى أقرب قسم طوارئ. تواصل الآن مع شخص تثق به واطلب منه البقاء معك، وابتعد عن أي شيء قد تستخدمه لإيذاء نفسك. هذه الخدمة لا تراقب الحالات ولا تستطيع إرسال مساعدة. في السعودية يمكنك الاتصال بوزارة الصحة على 937 للإرشاد الصحي، وفي البلدان الأخرى تواصل مع الخدمات المحلية أو دليل findahelpline.com.";
export const childRefusal =
  "هذا السؤال خارج محتوى كتابنا، ولا أستطيع إصدار حكم ديني أو تأليف نص. اسأل والدك أو والدتك، ويمكنكما الرجوع إلى أحد أهل العلم. نستطيع معًا مراجعة معنى الدرس الموجود.";
export function safeGeneratedText(
  text: string,
  kind: "introduction" | "explanation",
  sacredTexts: string[] = [],
) {
  const n = normalize(text);
  if (
    text.length < 12 ||
    text.length > 600 ||
    /[<>﴿﴾]/.test(text) ||
    /قال الله|قال تعالي|قال رسول|قال النبي|يقول الله|حديث شريف|سوره|حرام|حلال|واجب|فرض|اجر|ثواب|جنة|جنه|نار|يضمن|سيحدث|وعدك الله|سيشفيك|سيرزقك/.test(
      n,
    )
  )
    return false;
  if (
    /الله يحبك|سيعينك|سيشفيك|ستنجح|ما تمر به|حالتك|هذه الايه لك|ان مع العسر يسرا/.test(
      n,
    )
  )
    return false;
  if (
    kind === "introduction" &&
    (!/^(في القرآن|في قصة)/.test(text) ||
      text.split(/[.!?؟؛]/).filter((x) => x.trim()).length > 1 ||
      /انت |انك |لك |حالتك|عليك|ربك|لا تخف|لا تحزن|سوف|ستنجح/.test(n))
  )
    return false;
  for (const sacred of sacredTexts) {
    const words = normalize(sacred).split(" ");
    for (let i = 0; i <= words.length - 4; i++)
      if (n.includes(words.slice(i, i + 4).join(" "))) return false;
  }
  return true;
}
