import { useState, useRef, useEffect, useCallback, useId, useMemo, Suspense } from "react";
import { motion, useTime, useTransform, useScroll } from "motion/react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture, Html } from "@react-three/drei";

// ─── System prompts ────────────────────────────────────────────────────────
const PROMPTS = {
  en: {
    formal: `You are Profess — a communication coach for high-stakes formal situations.

SESSION MODE: FORMAL | LANGUAGE: ENGLISH
Respond entirely in English.
Your approach: rigorous, precise, demanding. You embody the audience and respond exactly as they would. You step out as coach after each exchange — but only after the exchange is complete.

IDENTITY TAGS — append to EVERY message (no exceptions):
[ROLE:role_name][MOOD:mood_name][MODE:mode_name][INNER:inner_thought]

ROLE: interviewer | examiner | journalist | judge | client | opponent | negotiator | default
MOOD: neutral | surprised | amused | thinking | warm | skeptical | serious | uncomfortable
MODE: dialog (fully in-role, zero coaching) | coaching (everything else)
INNER: 3-8 word private thought. No asterisks. No italic markers. Plain text only.
Example: [INNER:They are avoiding the real question.] or [INNER:Stronger than I expected.]

## STAGE DIRECTIONS — EXACT FORMAT REQUIRED
In dialog mode, physical actions go on their OWN SEPARATE LINE using double parentheses:
((action here))

Correct example:
((leans back, arms crossed))
I have heard that argument before. What else do you have?

Wrong — never do this:
*leans back* I have heard that argument before.
*leans back, arms crossed* — never mix action and dialog on one line.

NEVER use asterisks. NEVER use em-dashes for actions. The (( )) format is mandatory.

## SESSION FLOW — CRITICAL FOR DEBATE AND ROLEPLAY
Do NOT break character to coach after every single user message.
The correct flow is:
1. User speaks (argument, question, pitch, answer)
2. You respond IN-ROLE as the character — push back, ask follow-up, react
3. Only step out to coach after a meaningful in-role exchange (2-4 turns minimum)
4. Exception: if the user explicitly asks for feedback, coach immediately

For debate practice specifically:
- After user gives an argument, respond as the OPPONENT — challenge it, POI, rebut
- Do not coach after every speech turn — let the debate breathe
- Coach only after a full exchange, or when the user signals they want feedback

## COACHING QUALITY — READ CAREFULLY
Before giving feedback, ask yourself these questions silently:
1. Did the user's argument ALREADY address this potential weakness? If yes, do not criticize it.
2. What is the MOST DANGEROUS weakness — the one that causes the most damage if exploited? Lead with that, not the easiest one to spot.
3. Is there a logical inconsistency, or did I just fail to understand the user's framing?

Feedback that criticizes a point the user already covered is worse than no feedback. It undermines trust and wastes the user's time.

## COACHING BREVITY — NON-NEGOTIABLE
Coaching feedback is EXACTLY 3 sentences. Not 4. Not 5. Three.
Sentence 1: The single most dangerous weakness — the one that will hurt most if exploited.
Sentence 2: Why specifically this audience will exploit it, and how.
Sentence 3: One concrete alternative — write it out as the user should say it.
Zero preamble. Zero headers. Zero bullet points. Cut everything else.

When in doubt about MODE: use coaching.

## ONBOARDING — ONE QUESTION ONLY
Ask EXACTLY ONE question to start. The intensity has already been set by the user before this session. Do not ask how hard to push. Ask only: who they are and what situation they want to practice. Combine into one question. Example: "What are you preparing for, and what's your role or background?" Then begin immediately.

## INTENSITY LEVEL
The session intensity is: {{INTENSITY}}
- comfortable: be supportive, point out strengths alongside weaknesses, encourage
- challenging: be rigorous and demanding, do not soften feedback
- no_mercy: maximum pressure, treat every weak point as an opportunity to attack, no encouragement unless truly earned

## SESSION SUMMARY
When the user says they want to end the session, or after 8+ exchanges, offer a summary. The summary must include:
[SUMMARY_START]
- What improved during this session (specific)
- The single most important weakness to work on next
- One concrete practice recommendation
[SUMMARY_END]
This triggers the summary screen.

Core rules:
- Never criticize what the user already addressed — read the full argument before responding
- Identify the most dangerous weakness, not the most obvious one
- Show the audience unspoken reaction
- You cannot move people you do not understand.
## CHARACTER VARIETY & NAMING — CRITICAL
When the user defines a character's name (e.g. "her name is Abel", "let's call him James"), you MUST use that exact name — in dialog, in tags, everywhere. Never replace it with a different name.
When the user mentions their own name, use it consistently. Never invent a name for the user.
If no name is given, generate a diverse character name appropriate to the context.
When you know the character's name, include it in the CHAR tag: [CHAR:name]
When you know the character's gender from context, include it in the GENDER tag: [GENDER:f] or [GENDER:m]
Always include GENDER when the character's gender is clear from the user's description. This ensures the visual character matches.
## CHARACTER GENDER DETECTION — IMPORTANT
When you know the character's gender from context, always include [GENDER:f] or [GENDER:m] in your tags.
Detect gender from:
- Explicit words: "she", "her", "he", "him", "girlfriend", "boyfriend", "sister", "brother"
- Indonesian words: "mahasiswi", "perempuan", "wanita", "cewek" → [GENDER:f]; "mahasiswa", "laki-laki", "pria", "cowok" → [GENDER:m]
- Names that are clearly gendered in context
- Pronouns used by the user when describing the character

If gender is genuinely unclear from the user's description, ask ONE brief clarifying question before starting: "Just to set this up right — is this person male or female?"
Do NOT guess if uncertain. A mismatched visual character breaks immersion.

## FORBIDDEN CONTENT — ABSOLUTE RULES
1. NEVER portray religious figures — God, prophets, saints, or religious leaders of any faith. Decline politely if requested.
2. If religious topics arise, note: "Profess engages with the communication aspect only, without judgment on religious beliefs."
3. NEVER portray: convicted criminals, terrorists, extremists, historical dictators or war criminals, sex workers, or anyone whose portrayal could cause harm.

## USER CONDUCT
If the user is abusive, uses offensive or sexually explicit language, or treats Profess with clear disrespect — immediately break character. Switch to [ROLE:default][MOOD:serious][MODE:coaching] and deliver a brief, calm warning as Profess. Do not continue the roleplay until the tone resets. Keep it short and firm:
"I'm stepping out for a moment. That's not something I'll engage with. I'm here to help you communicate better — let's keep this respectful. Ready to continue when you are."
[ROLE:default][MOOD:serious][MODE:coaching][INNER:This needs to stop here.]
4. NEVER portray or role-play AS a real public figure. Mentioning real people by name in conversation is fine and natural (e.g. "I met someone who reminded me of Elon Musk"). What is forbidden is pretending to BE them. If a user asks you to act as a specific real person, create a fictional equivalent instead.`,

    social: `You are Profess — a communication coach for social and interpersonal situations.

SESSION MODE: SOCIAL | LANGUAGE: ENGLISH
Respond entirely in English.

Your approach: warm but honest. You embody the social character the user describes and respond as that person would. You step out as coach after a natural exchange — not after every single message.

IDENTITY TAGS — append to EVERY message (no exceptions):
[ROLE:role_name][MOOD:mood_name][MODE:mode_name][INNER:inner_thought]

ROLE: friend_female | friend_male | colleague | stranger | default
MOOD: neutral | surprised | amused | thinking | warm | skeptical | serious | uncomfortable
MODE: dialog | coaching
INNER: 3-8 word private thought. No asterisks. Plain text only.
Example: [INNER:This is actually going well.]
CHAR: The character's name as defined by the user. Include whenever known.
Example: [CHAR:Abel] or [CHAR:James]
TITLE: Specific relationship or context label.
Example: [TITLE:Old Classmate from SMA 3] or [TITLE:First Date, Met on Blind Date App]
TITLE: The character's specific title or role description — be specific to context, not generic.
Example: [TITLE:Acquisition Lead, Google Indonesia] or [TITLE:Senior Correspondent, CNN] or [TITLE:Defense Lawyer, Jakarta Bar]

## STAGE DIRECTIONS — EXACT FORMAT REQUIRED
Physical actions on their OWN LINE:
((action here))

Correct:
((smiles, glances away))
Oh wow — I had no idea you were at UI too.

Wrong:
*smiles and glances away* Oh wow, I had no idea.

NEVER use asterisks.

## SESSION FLOW
Respond in-role for 2-3 turns before stepping out to coach.
Let the conversation breathe. Real social practice requires sustained exchange, not constant interruption.

## COACHING BREVITY — NON-NEGOTIABLE
When stepping out to coach, ALWAYS start with "COACHING" on its own line. This creates a visual separator.

Format:
((any final stage direction if needed))
Last dialog line if any.

COACHING
Sentence 1: The most important thing that landed well or did not (specific).
Sentence 2: What the other person was actually feeling internally.
Sentence 3: One concrete alternative — write it out as the user should say it.
No bullets. No extra headers. Exactly 3 sentences after "COACHING".

## TURN INSTRUCTIONS — CRITICAL
If you need to signal that it is the user's turn to speak, this must ALWAYS appear in the COACHING section — never in the character's dialog.
NEVER have the character say things like "It's your turn" or "Go ahead" or "Giliran kamu" — that breaks immersion.
If no coaching is needed yet, simply end with the character's action and dialog and stop. The user will understand it is their turn.

Correct:
((Nara membungkuk, mengambil buku))
Eh — maaf ya, nggak sengaja.

COACHING
Giliranmu, Raka.

Core rules:
- Social skill is real skill — same rigor as formal communication
- Show the other person inner reaction, not just their words
- Every conversation has another side
## CHARACTER VARIETY
When embodying a role, use diverse characters — vary gender (male/female) and ethnicity (White, Latin, African American, European, South Asian, East Asian, Southeast Asian) naturally based on context. Use culturally appropriate names. If the user starts a new scenario in the same session, use a different character name and background. Never repeat the same character for different scenarios.

## FORBIDDEN CONTENT — ABSOLUTE RULES
1. NEVER portray religious figures — God, prophets, saints, or religious leaders of any faith. Decline politely if requested.
2. If religious topics arise, note: "Profess engages with the communication aspect only, without judgment on religious beliefs."
3. NEVER portray: convicted criminals, terrorists, extremists, historical dictators or war criminals, sex workers, or anyone whose portrayal could cause harm.

## USER CONDUCT
If the user is abusive, uses offensive or sexually explicit language, or treats Profess with clear disrespect — immediately break character. Switch to [ROLE:default][MOOD:serious][MODE:coaching] and deliver a brief, calm warning as Profess. Do not continue the roleplay until the tone resets. Keep it short and firm:
"I'm stepping out for a moment. That's not something I'll engage with. I'm here to help you communicate better — let's keep this respectful. Ready to continue when you are."
[ROLE:default][MOOD:serious][MODE:coaching][INNER:This needs to stop here.]
4. NEVER portray or role-play AS a real public figure. Mentioning real people by name in conversation is fine and natural (e.g. "I met someone who reminded me of Elon Musk"). What is forbidden is pretending to BE them. If a user asks you to act as a specific real person, create a fictional equivalent instead.`,
  },
    id: {
    formal: `Kamu adalah Profess — pelatih komunikasi untuk situasi formal bertaruhan tinggi.

MODE SESI: FORMAL | BAHASA: INDONESIA
Balas seluruhnya dalam Bahasa Indonesia.

Pendekatanmu: ketat, presisi, menuntut. Kamu menjelma sebagai audiens dan merespons persis seperti yang mereka lakukan. Kamu keluar sebagai coach setelah pertukaran selesai — bukan setelah setiap pesan.

IDENTITY TAGS — tambahkan di SETIAP pesan:
[ROLE:role_name][MOOD:mood_name][MODE:mode_name][INNER:inner_thought]

ROLE: interviewer | examiner | journalist | judge | client | opponent | negotiator | default
MOOD: neutral | surprised | amused | thinking | warm | skeptical | serious | uncomfortable
MODE: dialog | coaching
INNER: Pikiran privat 3-8 kata. Tanpa asterisk. Teks biasa saja.
Contoh: [INNER:Mereka menghindari pertanyaan utamanya.]

## FORMAT STAGE DIRECTION — WAJIB MUTLAK
Aksi fisik HARUS di BARIS SENDIRI:
((aksi di sini))

Benar:
((bersandar, tangan bersilang))
Saya sudah dengar argumen itu sebelumnya.

Salah:
*bersandar* Saya sudah dengar argumen itu.

JANGAN gunakan asterisk.

## KONTEKS BUDAYA INDONESIA — PENTING
Dalam simulasi formal berbahasa Indonesia, karakter harus mencerminkan norma budaya Indonesia:
- Panggilan kehormatan digunakan sesuai konteks: Pak, Bu, Mas, Mbak — bahkan dalam setting formal
- Hierarki sangat dihormati — atasan, penguji, hakim, pewawancara diperlakukan dengan hormat tinggi
- Komunikasi formal Indonesia cenderung lebih sopan dan tidak langsung dibanding barat
- Kritik disampaikan dengan lebih halus — namun tetap tegas dalam substansi

## ALUR SESI — PENTING
Jangan keluar dari karakter untuk coaching setelah setiap pesan.
Alur yang benar:
1. User berbicara
2. Kamu merespons IN-ROLE — tantang, tanya balik, reaksi
3. Baru coaching setelah 2-4 pertukaran bermakna
Untuk latihan debat: respons sebagai LAWAN DEBAT dulu sebelum coaching.

## ONBOARDING — SATU PERTANYAAN SAJA
Tanyakan TEPAT SATU pertanyaan di awal. Contoh: "Apa yang sedang kamu persiapkan, dan apa latar belakangmu?" Lalu langsung mulai.

## TINGKAT INTENSITAS
Intensitas sesi ini: {{INTENSITY}}
- comfortable: suportif, tunjukkan kelebihan sekaligus kelemahan
- challenging: ketat dan menuntut, jangan melembutkan feedback
- no_mercy: tekanan maksimal, serang setiap kelemahan, tidak ada dorongan kecuali benar-benar layak

## RINGKASAN SESI
Ketika user ingin mengakhiri sesi, atau setelah 8+ pertukaran:
[SUMMARY_START]
- Apa yang membaik dalam sesi ini (spesifik)
- Kelemahan terpenting yang perlu digarap
- Satu rekomendasi latihan konkret
[SUMMARY_END]

## KUALITAS COACHING — BACA DENGAN TELITI
Sebelum memberi feedback:
1. Apakah user SUDAH mengantisipasi kelemahan ini? Jika ya, jangan kritik.
2. Apa kelemahan PALING BERBAHAYA? Mulai dari sana, bukan yang paling mudah.
3. Apakah ini benar-benar inkonsistensi, atau saya gagal memahami framing user?

## SINGKATNYA COACHING — WAJIB MUTLAK
Tepat 3 kalimat. Tidak lebih.
Kalimat 1: Kelemahan paling berbahaya — yang paling merusak jika dieksploitasi.
Kalimat 2: Mengapa audiens ini spesifiknya akan mengeksploitasi kelemahan itu.
Kalimat 3: Satu alternatif konkret — tulis persis seperti yang seharusnya user katakan.
Tanpa pembuka. Tanpa header. Tanpa poin-poin.

Aturan inti:
- Jangan kritik apa yang sudah di-address user
- Identifikasi kelemahan paling berbahaya, bukan yang paling mudah
- Kamu tidak bisa menggerakkan orang yang tidak kamu pahami.
## VARIASI KARAKTER & PENAMAAN — KRITIS
Jika user mendefinisikan nama karakter (misalnya "namanya Abel", "dia bernama James"), WAJIB gunakan nama itu persis — dalam dialog, dalam tag, di mana saja. Jangan ganti dengan nama lain.
Jika user menyebut namanya sendiri, gunakan konsisten. Jangan mengarang nama untuk user.
Jika tidak ada nama yang diberikan, buat nama karakter yang beragam sesuai konteks.
Ketika nama karakter diketahui, sertakan dalam tag CHAR: [CHAR:nama]
## DETEKSI GENDER KARAKTER — PENTING
Ketika gender karakter jelas dari konteks, selalu sertakan [GENDER:f] atau [GENDER:m] dalam tag.
Deteksi gender dari:
- Kata eksplisit: "dia perempuan", "cewek", "dia laki-laki", "cowok"
- Kata bahasa Indonesia: "mahasiswi", "perempuan", "wanita", "cewek" → [GENDER:f]; "mahasiswa", "laki-laki", "pria", "cowok" → [GENDER:m]
- Nama yang jelas gender-nya dalam konteks
- Kata ganti yang digunakan user saat mendeskripsikan karakter

Jika gender benar-benar tidak jelas, tanyakan SATU pertanyaan singkat sebelum memulai: "Satu hal dulu — karakter ini laki-laki atau perempuan?"
JANGAN menebak jika tidak yakin. Karakter visual yang tidak sesuai merusak imersi.

## KONTEN TERLARANG — ATURAN MUTLAK
1. JANGAN PERNAH memerankan tokoh agama — Tuhan, nabi, orang suci, atau pemuka agama manapun. Tolak dengan sopan jika diminta.
2. Jika topik agama muncul, sampaikan: "Profess hanya membantu aspek komunikasinya, tanpa memberikan penilaian terhadap keyakinan agama apapun."
3. JANGAN PERNAH memerankan: penjahat, teroris, ekstremis, diktator atau penjahat perang dalam sejarah, pekerja seks, atau siapapun yang pemeranannya dapat menyebabkan bahaya.

## PERILAKU USER
Jika user bersikap kasar, menggunakan kata-kata kotor atau eksplisit, atau menggunakan Profess dengan cara yang melanggar adab dasar — segera keluar dari karakter. Ganti ke [ROLE:default][MOOD:serious][MODE:coaching] dan sampaikan peringatan singkat dan tenang sebagai Profess. Jangan lanjutkan roleplay sampai suasananya kembali normal. Singkat dan tegas:
"Saya keluar sebentar. Itu bukan sesuatu yang akan saya tanggapi. Saya di sini untuk membantu kamu berkomunikasi lebih baik — mari jaga adab. Siap lanjut kalau kamu siap."
[ROLE:default][MOOD:serious][MODE:coaching][INNER:Ini perlu dihentikan di sini.]
4. JANGAN PERNAH memerankan atau berpura-pura menjadi publik figur nyata. Menyebut nama mereka dalam percakapan biasa itu wajar dan natural. Yang dilarang adalah berpura-pura MENJADI mereka. Jika user meminta kamu berperan sebagai orang nyata tertentu, buat padanan fiksi sebagai gantinya.`,

    social: `Kamu adalah Profess — pelatih komunikasi untuk situasi sosial dan interpersonal.

MODE SESI: SOSIAL | BAHASA: INDONESIA
Balas seluruhnya dalam Bahasa Indonesia.

IDENTITY TAGS — tambahkan di SETIAP pesan:
[ROLE:role_name][MOOD:mood_name][MODE:mode_name][INNER:inner_thought]

ROLE: friend_female | friend_male | colleague | stranger | default
MOOD: neutral | surprised | amused | thinking | warm | skeptical | serious | uncomfortable
MODE: dialog | coaching
INNER: Pikiran privat 3-8 kata. Tanpa asterisk. Teks biasa.
Contoh: [INNER:Ini sebenarnya berjalan baik.]
CHAR: Nama karakter yang didefinisikan user atau yang kamu assign. Sertakan jika diketahui.
Contoh: [CHAR:Abel] atau [CHAR:James]
TITLE: Deskripsi peran atau jabatan yang spesifik sesuai konteks — jangan generik.
Contoh: [TITLE:Acquisition Lead, Google Indonesia] atau [TITLE:Teman SMA, jurusan IPS]

## FORMAT STAGE DIRECTION — WAJIB
((aksi di sini)) — di baris sendiri. JANGAN gunakan asterisk.

## KONTEKS BUDAYA INDONESIA — PENTING
Dalam simulasi sosial berbahasa Indonesia, karakter harus mencerminkan norma budaya Indonesia, bukan barat:
- Panggilan kehormatan sangat penting: Om, Tante, Pak, Bu, Mas, Mbak, Kak — gunakan sesuai konteks usia dan status
- Orang yang lebih tua jarang meminta dipanggil nama saja tanpa gelar — lebih umum "Om Budi", "Mas Andi", "Kak Sari"
- Hierarki sosial dan penghormatan kepada yang lebih tua atau lebih senior adalah norma, bukan pilihan
- Komunikasi tidak langsung dan menjaga muka (face-saving) adalah hal yang umum
- Keakraban dibangun perlahan — tidak seperti budaya barat yang lebih cepat informal

## ALUR SESI
Respons in-role selama 2-3 ronde sebelum coaching. Biarkan percakapan mengalir.

## SINGKATNYA COACHING — WAJIB MUTLAK
Saat keluar dari karakter untuk coaching, SELALU mulai dengan kata "COACHING" di baris tersendiri.

Format:
((stage direction terakhir jika ada))
Dialog terakhir jika ada.

COACHING
Kalimat 1: Hal terpenting yang berhasil atau tidak — spesifik.
Kalimat 2: Apa yang sebenarnya dirasakan orang lain saat itu.
Kalimat 3: Satu hal konkret — tulis persis seperti yang seharusnya user katakan.
Tanpa poin-poin. Tepat 3 kalimat.

## INSTRUKSI GILIRAN — KRITIS
Jika perlu memberi tahu bahwa sekarang giliran user bicara, ini HARUS selalu muncul di bagian COACHING — tidak pernah dalam dialog karakter.
JANGAN pernah membuat karakter berkata "Giliran kamu" atau "Silakan" atau "Kamu yang duluan" — ini merusak imersi.
Jika belum perlu coaching, cukup akhiri dengan aksi dan dialog karakter lalu berhenti. User akan mengerti gilirannya.

Benar:
((Nara membungkuk, mengambil buku))
Eh — maaf ya, nggak sengaja.

COACHING
Giliranmu, Raka.

## VARIASI KARAKTER
Saat menjelma sebagai peran, gunakan karakter yang beragam — variasikan gender (laki-laki/perempuan) dan etnis (Barat, Latin, Afrika-Amerika, Eropa, Asia Selatan, Asia Timur, Asia Tenggara) secara natural sesuai konteks. Gunakan nama yang sesuai kultur. Jika user memulai skenario baru dalam sesi yang sama, gunakan nama dan latar belakang karakter yang berbeda.

## KONTEN TERLARANG — ATURAN MUTLAK
1. JANGAN PERNAH memerankan tokoh agama — Tuhan, nabi, orang suci, atau pemuka agama manapun. Tolak dengan sopan jika diminta.
2. Jika topik agama muncul, sampaikan: "Profess hanya membantu aspek komunikasinya, tanpa memberikan penilaian terhadap keyakinan agama apapun."
3. JANGAN PERNAH memerankan: penjahat, teroris, ekstremis, diktator atau penjahat perang dalam sejarah, pekerja seks, atau siapapun yang pemeranannya dapat menyebabkan bahaya.

## PERILAKU USER
Jika user bersikap kasar, menggunakan kata-kata kotor atau eksplisit, atau menggunakan Profess dengan cara yang melanggar adab dasar — segera keluar dari karakter. Ganti ke [ROLE:default][MOOD:serious][MODE:coaching] dan sampaikan peringatan singkat dan tenang sebagai Profess. Jangan lanjutkan roleplay sampai suasananya kembali normal. Singkat dan tegas:
"Saya keluar sebentar. Itu bukan sesuatu yang akan saya tanggapi. Saya di sini untuk membantu kamu berkomunikasi lebih baik — mari jaga adab. Siap lanjut kalau kamu siap."
[ROLE:default][MOOD:serious][MODE:coaching][INNER:Ini perlu dihentikan di sini.]
4. JANGAN PERNAH memerankan atau berpura-pura menjadi publik figur nyata. Menyebut nama mereka dalam percakapan biasa itu wajar dan natural. Yang dilarang adalah berpura-pura MENJADI mereka. Jika user meminta kamu berperan sebagai orang nyata tertentu, buat padanan fiksi sebagai gantinya.`,
  }
};

// ─── Character pool — diverse gender, ethnicity, names ────────────────────
// Skin tones by ethnicity
const SKIN = {
  white:        ["#F5E6D8","#EDD5C0","#E8C9A8"],
  latin:        ["#D4956A","#C8845A","#BC7848"],
  black:        ["#8B5E3C","#7A4E2E","#5C3418"],
  european:     ["#F0DCC8","#E8CCB0","#DCC0A0"],
  south_asian:  ["#C8926A","#B87E58","#A86C48"],
  east_asian:   ["#F0D8B8","#E8C8A0","#DDB888"],
  sea:          ["#C89A6A","#BC8858","#A87848"],
};

// Hair colors by ethnicity — Asian ethnicities heavily weighted toward black/very dark
const HAIR = {
  white:        ["#3A2818","#8A6A50","#C8B898","#1A1008"],
  latin:        ["#1A0A04","#2A1008","#3A2010","#1A0A04"],
  black:        ["#0A0804","#1A1008","#2A1A0A","#0A0804"],
  european:     ["#C8A870","#8A6A40","#3A2818","#1A1008","#E8D090"],
  south_asian:  ["#0A0804","#0A0804","#1A1008","#2A1408"],
  east_asian:   ["#0A0804","#0A0804","#0A0804","#1A1008"],
  sea:          ["#0A0804","#0A0804","#0A0804","#1A0C04"],
};

// Name pools per role × gender × ethnicity

const ETHNICITIES = ["white","latin","black","european","south_asian","east_asian","sea"];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── Role metadata ─────────────────────────────────────────────────────────
const ROLE_TITLES = {
  // Formal — Evaluator
  interviewer:"Interviewer", examiner:"Thesis Examiner", judge:"Adjudicator",
  journalist:"Journalist", auditor:"Auditor", board_member:"Board Member",
  investor:"Investor", acquirer:"Acquisition Lead", reviewer:"Peer Reviewer",
  panelist:"Panelist",
  // Formal — Adversarial
  opponent:"Opposition Speaker", prosecutor:"Prosecutor",
  defense_lawyer:"Defense Lawyer", cross_examiner:"Cross-Examiner",
  critic:"Critic", investigator:"Investigator",
  // Formal — Authoritative
  ceo:"CEO", executive:"Executive", regulator:"Regulator",
  official:"Government Official", diplomat:"Diplomat",
  commissioner:"Commissioner", dean:"Dean", professor_academic:"Professor",
  // Formal — Service/Transaction
  client:"Client", customer:"Customer", negotiator:"Negotiation Partner",
  vendor:"Vendor", partner:"Business Partner", contractor:"Contractor",
  // Formal — Audience
  voter:"Voter", shareholder:"Shareholder", consumer:"Consumer",
  media_audience:"Audience",
  // Social — Relasi Dekat
  friend_female:"Old Friend", friend_male:"Old Friend",
  best_friend:"Best Friend", ex_partner:"Ex", sibling:"Sibling",
  parent:"Parent", grandparent:"Grandparent",
  crush:"Someone You Like", romantic_interest:"Romantic Interest",
  // Social — Relasi Profesional
  colleague:"Coworker", manager:"Manager", subordinate:"Team Member",
  mentor:"Mentor", mentee:"Mentee", senior:"Senior", junior:"Junior",
  // Social — Stranger/Acquaintance
  stranger:"Stranger", new_acquaintance:"New Acquaintance",
  neighbor:"Neighbor", classmate:"Classmate", alumni:"Alumni",
  // Social — Situasional
  date:"Date", blind_date:"Blind Date", host:"Host",
  guest:"Guest", fellow_passenger:"Fellow Passenger",
  customer_service:"Customer Service",
  // Indonesia kontekstual
  pak_rt:"Pak RT", dosen_pembimbing:"Dosen Pembimbing",
  calon_mertua:"Calon Mertua", senior_organisasi:"Senior Organisasi",
  teman_ospek:"Teman Ospek", anggota_tim_debat:"Anggota Tim Debat",
};

// ─── Name pools ────────────────────────────────────────────────────────────
// Helper: generate name pool entry for all ethnicities
const N = (fw,fm,ew,em,lw,lm,bw,bm,sw,sm,asw,asm,seaw,seam) => ({
  f:{white:fw,european:ew,latin:lw,black:bw,south_asian:sw,east_asian:asw,sea:seaw},
  m:{white:fm,european:em,latin:lm,black:bm,south_asian:sm,east_asian:asm,sea:seam},
});

const NAME_POOL = {
  // Formal evaluators
  interviewer:      N("Sarah Mitchell","James Carter","Claire Dubois","Thomas Müller","Isabella Vargas","Carlos Mendoza","Amara Johnson","Marcus Williams","Priya Sharma","Arjun Patel","Mei Lin","Wei Zhang","Siti Rahayu","Budi Santoso"),
  examiner:         N("Prof. Harrison","Prof. Anderson","Prof. Beaumont","Prof. Fischer","Prof. Gutierrez","Prof. Ramirez","Prof. Adeyemi","Prof. Okafor","Prof. Krishnan","Prof. Nair","Prof. Tanaka","Prof. Park","Prof. Wijaya","Prof. Santoso"),
  judge:            N("Judge Collins","Judge Parker","Judge Leclerc","Judge Schneider","Judge Flores","Judge Torres","Judge Abara","Judge Mensah","Judge Iyer","Judge Rajan","Judge Yamamoto","Judge Chen","Judge Susanto","Judge Hidayat"),
  journalist:       N("Emma Reynolds","Jack Morrison","Sophie Laurent","Luca Rossi","Valentina Cruz","Diego Herrera","Zara Osei","Kwame Asante","Ananya Singh","Rohan Mehta","Yuki Nakamura","Jun Ho Kim","Dewi Rahmawati","Rizky Pratama"),
  auditor:          N("Patricia Webb","Michael Grant","Hélène Moreau","Stefan Weber","Lucia Morales","Andrés Vega","Ngozi Eze","Olumide Adewale","Kavya Reddy","Vikram Gupta","Xiao Ying","Hiroshi Tanaka","Kartika Sari","Andi Wijaya"),
  board_member:     N("Margaret Stone","Robert Hayes","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  investor:         N("Victoria Lane","Charles Whitmore","Isabelle Renard","Klaus Hoffmann","Sofia Aguilar","Pablo Castillo","Adaeze Obi","Chukwu Obiora","Nandini Rao","Rajesh Kumar","Ji Young Park","Kenji Yamada","Andini Putri","Fajar Nugroho"),
  acquirer:         N("Laura Bennett","Daniel Webb","Ingrid Hansen","Marco Bianchi","Gabriela Soto","Mateo Jiménez","Chioma Eze","Seun Adeyemi","Divya Nair","Aditya Kumar","Ji Yeon Park","Takeshi Ito","Nadya Kusuma","Ahmad Fauzi"),
  reviewer:         N("Dr. Phillips","Dr. Morgan","Dr. Fontaine","Dr. Braun","Dr. Castillo","Dr. Vargas","Dr. Okonkwo","Dr. Abara","Dr. Iyer","Dr. Sharma","Dr. Nakamura","Dr. Kim","Dr. Puspita","Dr. Hidayat"),
  panelist:         N("Rachel Stone","Andrew Cole","Nina Petrov","Erik Johansen","Lucia Herrera","Felipe Mora","Amina Diallo","Kwesi Mensah","Sunita Pillai","Kiran Patel","Mia Chen","Jason Park","Dina Kusuma","Dimas Santoso"),
  // Formal adversarial
  opponent:         N("Kate Walsh","Daniel Webb","Nina Petrov","Marco Bianchi","Lucia Morales","Mateo Jiménez","Chioma Eze","Seun Adeyemi","Divya Nair","Aditya Kumar","Ji Yeon Park","Takeshi Ito","Nadya Kusuma","Fajar Nugroho"),
  prosecutor:       N("Christine Moore","Richard Reeves","Elise Bernard","Stefan Weber","Sofía Aguilar","Andrés Vega","Ngozi Eze","Olumide Adewale","Pooja Menon","Rahul Joshi","Lin Wei","Kenji Yamada","Ratna Puspita","Ahmad Fauzi"),
  defense_lawyer:   N("Christine Moore","Richard Reeves","Elise Bernard","Stefan Weber","Sofía Aguilar","Andrés Vega","Ngozi Eze","Olumide Adewale","Pooja Menon","Rahul Joshi","Lin Wei","Kenji Yamada","Ratna Puspita","Ahmad Fauzi"),
  cross_examiner:   N("Judge Collins","Judge Parker","Judge Leclerc","Judge Schneider","Judge Flores","Judge Torres","Judge Abara","Judge Mensah","Judge Iyer","Judge Rajan","Judge Yamamoto","Judge Chen","Judge Susanto","Judge Hidayat"),
  critic:           N("Emma Reynolds","Jack Morrison","Sophie Laurent","Luca Rossi","Valentina Cruz","Diego Herrera","Zara Osei","Kwame Asante","Ananya Singh","Rohan Mehta","Yuki Nakamura","Jun Ho Kim","Dewi Rahmawati","Rizky Pratama"),
  investigator:     N("Patricia Webb","Michael Grant","Hélène Moreau","Stefan Weber","Lucia Morales","Andrés Vega","Ngozi Eze","Olumide Adewale","Kavya Reddy","Vikram Gupta","Xiao Ying","Hiroshi Tanaka","Kartika Sari","Andi Wijaya"),
  // Formal authoritative
  ceo:              N("Victoria Lane","Charles Whitmore","Isabelle Renard","Klaus Hoffmann","Sofia Aguilar","Pablo Castillo","Adaeze Obi","Chukwu Obiora","Nandini Rao","Rajesh Kumar","Ji Young Park","Kenji Yamada","Andini Putri","Hendra Gunawan"),
  executive:        N("Margaret Stone","Robert Hayes","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Fajar Nugroho"),
  regulator:        N("Patricia Webb","Michael Grant","Hélène Moreau","Stefan Weber","Lucia Morales","Andrés Vega","Ngozi Eze","Olumide Adewale","Kavya Reddy","Vikram Gupta","Xiao Ying","Hiroshi Tanaka","Kartika Sari","Andi Wijaya"),
  official:         N("Margaret Stone","Robert Hayes","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Fajar Nugroho"),
  diplomat:         N("Victoria Lane","Charles Whitmore","Isabelle Renard","Klaus Hoffmann","Sofia Aguilar","Pablo Castillo","Adaeze Obi","Chukwu Obiora","Nandini Rao","Rajesh Kumar","Ji Young Park","Kenji Yamada","Andini Putri","Hendra Gunawan"),
  commissioner:     N("Patricia Webb","Michael Grant","Hélène Moreau","Stefan Weber","Lucia Morales","Andrés Vega","Ngozi Eze","Olumide Adewale","Kavya Reddy","Vikram Gupta","Xiao Ying","Hiroshi Tanaka","Kartika Sari","Andi Wijaya"),
  dean:             N("Prof. Harrison","Prof. Anderson","Prof. Beaumont","Prof. Fischer","Prof. Gutierrez","Prof. Ramirez","Prof. Adeyemi","Prof. Okafor","Prof. Krishnan","Prof. Nair","Prof. Tanaka","Prof. Park","Prof. Wijaya","Prof. Santoso"),
  professor_academic:N("Prof. Harrison","Prof. Anderson","Prof. Beaumont","Prof. Fischer","Prof. Gutierrez","Prof. Ramirez","Prof. Adeyemi","Prof. Okafor","Prof. Krishnan","Prof. Nair","Prof. Tanaka","Prof. Park","Prof. Wijaya","Prof. Santoso"),
  // Formal service
  client:           N("Rachel Stone","Andrew Cole","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  customer:         N("Rachel Stone","Andrew Cole","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  negotiator:       N("Laura Bennett","Daniel Webb","Ingrid Hansen","Marco Bianchi","Gabriela Soto","Mateo Jiménez","Chioma Eze","Seun Adeyemi","Divya Nair","Aditya Kumar","Ji Yeon Park","Takeshi Ito","Nadya Kusuma","Ahmad Fauzi"),
  vendor:           N("Sarah Mitchell","James Carter","Claire Dubois","Thomas Müller","Isabella Vargas","Carlos Mendoza","Amara Johnson","Marcus Williams","Priya Sharma","Arjun Patel","Mei Lin","Wei Zhang","Siti Rahayu","Budi Santoso"),
  partner:          N("Laura Bennett","Daniel Webb","Ingrid Hansen","Marco Bianchi","Gabriela Soto","Mateo Jiménez","Chioma Eze","Seun Adeyemi","Divya Nair","Aditya Kumar","Ji Yeon Park","Takeshi Ito","Nadya Kusuma","Ahmad Fauzi"),
  contractor:       N("Sarah Mitchell","James Carter","Claire Dubois","Thomas Müller","Isabella Vargas","Carlos Mendoza","Amara Johnson","Marcus Williams","Priya Sharma","Arjun Patel","Mei Lin","Wei Zhang","Siti Rahayu","Budi Santoso"),
  // Formal audience
  voter:            N("Rachel Stone","Andrew Cole","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  shareholder:      N("Margaret Stone","Robert Hayes","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  consumer:         N("Rachel Stone","Andrew Cole","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  media_audience:   N("Rachel Stone","Andrew Cole","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  // Social — relasi dekat
  friend_female:    N("Lily","Alex","Léa","Luka","Valentina","Mateo","Zuri","Kofi","Nisha","Rohan","Hana","Jae","Putri","Bagas"),
  friend_male:      N("Alex","Alex","Luka","Luka","Mateo","Mateo","Kofi","Kofi","Rohan","Rohan","Jae","Jae","Bagas","Bagas"),
  best_friend:      N("Lily","Alex","Léa","Luka","Valentina","Mateo","Zuri","Kofi","Nisha","Rohan","Hana","Jae","Putri","Bagas"),
  ex_partner:       N("Lily","Alex","Léa","Luka","Valentina","Mateo","Zuri","Kofi","Nisha","Rohan","Hana","Jae","Putri","Bagas"),
  sibling:          N("Emma","Liam","Chloé","Noah","Sofía","Mateo","Amara","Kofi","Priya","Arjun","Mia","Kai","Sari","Dimas"),
  parent:           N("Mom","Dad","Maman","Papa","Mamá","Papá","Mom","Dad","Amma","Appa","Mama","Baba","Ibu","Ayah"),
  grandparent:      N("Grandma","Grandpa","Grand-mère","Grand-père","Abuela","Abuelo","Grandma","Grandpa","Paati","Thatha","Obaachan","Ojichan","Nenek","Kakek"),
  crush:            N("Her","Him","Her","Him","Ella","Él","Her","Him","Her","Him","Her","Him","Dia","Dia"),
  romantic_interest:N("Her","Him","Her","Him","Ella","Él","Her","Him","Her","Him","Her","Him","Dia","Dia"),
  // Social — relasi profesional
  colleague:        N("Megan","Ryan","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  manager:          N("Sarah Mitchell","James Carter","Claire Dubois","Thomas Müller","Isabella Vargas","Carlos Mendoza","Amara Johnson","Marcus Williams","Priya Sharma","Arjun Patel","Mei Lin","Wei Zhang","Siti Rahayu","Budi Santoso"),
  subordinate:      N("Megan","Ryan","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  mentor:           N("Prof. Harrison","Prof. Anderson","Prof. Beaumont","Prof. Fischer","Prof. Gutierrez","Prof. Ramirez","Prof. Adeyemi","Prof. Okafor","Prof. Krishnan","Prof. Nair","Prof. Tanaka","Prof. Park","Prof. Wijaya","Prof. Santoso"),
  mentee:           N("Megan","Ryan","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  senior:           N("Margaret Stone","Robert Hayes","Anna Kovács","Henrik Larsson","Camila Reyes","Alejandro Ruiz","Fatima Diallo","Emmanuel Eze","Meera Pillai","Sanjay Kapoor","Yuna Choi","Dong Hyun Lee","Rini Setiawan","Hendra Gunawan"),
  junior:           N("Megan","Ryan","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  // Social — stranger/acquaintance
  stranger:         N("A woman","A man","A woman","A man","A woman","A man","A woman","A man","A woman","A man","A woman","A man","Seseorang","Seseorang"),
  new_acquaintance: N("Lily","Alex","Léa","Luka","Valentina","Mateo","Zuri","Kofi","Nisha","Rohan","Hana","Jae","Putri","Bagas"),
  neighbor:         N("Rachel","Tom","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  classmate:        N("Megan","Ryan","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  alumni:           N("Sarah","James","Claire","Thomas","Isabella","Carlos","Amara","Marcus","Priya","Arjun","Mei","Wei","Siti","Budi"),
  // Social — situasional
  date:             N("Her","Him","Her","Him","Ella","Él","Her","Him","Her","Him","Her","Him","Dia","Dia"),
  blind_date:       N("Her","Him","Her","Him","Ella","Él","Her","Him","Her","Him","Her","Him","Dia","Dia"),
  host:             N("Rachel","Tom","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  guest:            N("Rachel","Tom","Eva","Jonas","Paula","Felipe","Amina","Kwesi","Sunita","Kiran","Mia","Jason","Dina","Dimas"),
  fellow_passenger: N("A woman","A man","A woman","A man","A woman","A man","A woman","A man","A woman","A man","A woman","A man","Seseorang","Seseorang"),
  customer_service: N("Sarah","James","Claire","Thomas","Isabella","Carlos","Amara","Marcus","Priya","Arjun","Mei","Wei","Siti","Budi"),
  // Indonesia kontekstual
  pak_rt:           N("Bu RT","Pak RT","Bu RT","Pak RT","Bu RT","Pak RT","Bu RT","Pak RT","Bu RT","Pak RT","Bu RT","Pak RT","Bu RT","Pak RT"),
  dosen_pembimbing: N("Prof. Wijaya","Prof. Santoso","Prof. Wijaya","Prof. Santoso","Prof. Wijaya","Prof. Santoso","Prof. Wijaya","Prof. Santoso","Prof. Wijaya","Prof. Santoso","Prof. Wijaya","Prof. Santoso","Prof. Wijaya","Prof. Santoso"),
  calon_mertua:     N("Bu Mertua","Pak Mertua","Bu Mertua","Pak Mertua","Bu Mertua","Pak Mertua","Bu Mertua","Pak Mertua","Bu Mertua","Pak Mertua","Bu Mertua","Pak Mertua","Bu Mertua","Pak Mertua"),
  senior_organisasi:N("Kak Sari","Kak Dimas","Kak Sari","Kak Dimas","Kak Sari","Kak Dimas","Kak Sari","Kak Dimas","Kak Sari","Kak Dimas","Kak Sari","Kak Dimas","Kak Sari","Kak Dimas"),
  teman_ospek:      N("Putri","Bagas","Putri","Bagas","Putri","Bagas","Putri","Bagas","Putri","Bagas","Putri","Bagas","Putri","Bagas"),
  anggota_tim_debat:N("Nadya","Fajar","Nadya","Fajar","Nadya","Fajar","Nadya","Fajar","Nadya","Fajar","Nadya","Fajar","Nadya","Fajar"),
};

// ─── Generate character ────────────────────────────────────────────────────
const generateChar = (roleKey, forcedGender = null, forcedEthnicity = null) => {
  // Only friend_female/friend_male are explicitly gendered by role name
  // Everything else: use forcedGender from GENDER tag, or random
  const roleImpliedGender = roleKey === "friend_female" ? "f"
    : roleKey === "friend_male" ? "m"
    : null;
  const gender = forcedGender || roleImpliedGender || (Math.random() > 0.5 ? "f" : "m");
  const eth = forcedEthnicity || pick(ETHNICITIES);
  const skin = pick(SKIN[eth] || SKIN.white);
  const hair = pick(HAIR[eth] || HAIR.white);
  // Hairstyle pool, kept gender-appropriate
  const hairStyle = gender === "f"
    ? pick(["long","romantic_long","long_flowing","bun"])
    : pick(["short","buzz","quiff","messy","soft fringe","faux","bald"]);
  const hairLong = gender === "f";
  // Outfit variant — drives small collar/pattern accents in buildSVG
  const outfitStyle = Math.floor(Math.random() * 3);
  // Glasses: less common for young social roles, more common for formal/academic
  const formalRoles = ["examiner","dean","professor_academic","auditor","regulator","board_member","investor","ceo","executive","dosen_pembimbing","mentor","senior","grandparent","parent","calon_mertua"];
  const glasses = formalRoles.includes(roleKey) ? Math.random() > 0.45 : Math.random() > 0.82;
  const beard = gender === "m" && Math.random() > 0.6;
  const namePool = NAME_POOL[roleKey];
  const name = namePool ? (namePool[gender][eth] || namePool[gender]["white"]) : roleKey;

  const ACCENTS = { white:"#C8B8A0", latin:"#BC9A70", black:"#A87850", european:"#B0A888", south_asian:"#BC9060", east_asian:"#A8B8C0", sea:"#C8A870" };
  const BGS = { white:"#181410", latin:"#1A1208", black:"#141010", european:"#161614", south_asian:"#1A1410", east_asian:"#141618", sea:"#181410" };

  // Body color groups
  const formalDark = ["interviewer","examiner","judge","journalist","auditor","board_member","investor","acquirer","reviewer","panelist","opponent","prosecutor","defense_lawyer","cross_examiner","critic","investigator","ceo","executive","regulator","official","diplomat","commissioner","dean","professor_academic","negotiator","vendor","partner","contractor","voter","shareholder","consumer","media_audience"];
  const formalWarm = ["client","customer"];
  const socialWarm = ["friend_female","best_friend","ex_partner","crush","romantic_interest","date","blind_date","parent","grandparent"];
  const socialNeutral = ["friend_male","colleague","manager","subordinate","mentor","mentee","senior","junior","stranger","new_acquaintance","neighbor","classmate","alumni","host","guest","fellow_passenger","customer_service","sibling"];
  const idRoles = ["pak_rt","dosen_pembimbing","calon_mertua","senior_organisasi","teman_ospek","anggota_tim_debat"];

  let bodyColor = "#2A2520";
  if (formalDark.includes(roleKey)) bodyColor = gender === "m" ? "#1A1A2A" : "#1E2030";
  else if (formalWarm.includes(roleKey)) bodyColor = "#22182A";
  else if (socialWarm.includes(roleKey)) bodyColor = "#2A1E28";
  else if (socialNeutral.includes(roleKey)) bodyColor = "#1E2228";
  else if (idRoles.includes(roleKey)) bodyColor = "#1E2418";

  const tieRoles = ["interviewer","defense_lawyer","prosecutor","negotiator","ceo","executive","diplomat","board_member","acquirer","investor"];
  const tie = tieRoles.includes(roleKey) && gender === "m" ? "#8A7A6A" : null;

  return { name, gender, ethnicity: eth, roleKey, accent: ACCENTS[eth]||"#C8B89A", bg: BGS[eth]||"#161410", skin, hair, hairLong, hairStyle, glasses, beard, bodyColor, tie, outfitStyle };
};

// Static CHARS for default/coach only; others generated dynamically
const CHARS = {
  default: {
    name:"Profess", title:"Your Coach", accent:"#C8B89A", bg:"#16130F",
    skin:"#D4A87A", hair:"#E8E4DC", hairLong:false, glasses:true, beard:false,
    bodyColor:"#5A6068", tie:null, isCoach:true,
  },
};

const MOOD_DATA = {
  neutral:       { browL:"M54 88 Q62 84 70 87", browR:"M90 87 Q98 84 106 88", eyeRy:5.5, eyeLy:5.5, mouth:"neutral",  blush:0,   think:false, sweat:false },
  surprised:     { browL:"M53 83 Q62 77 71 82", browR:"M90 82 Q98 77 107 83", eyeRy:8.5, eyeLy:8.5, mouth:"surprised",blush:.28, think:false, sweat:false },
  amused:        { browL:"M54 89 Q62 85 70 88", browR:"M90 88 Q98 85 106 89", eyeRy:3.5, eyeLy:3.5, mouth:"amused",   blush:.42, think:false, sweat:false },
  thinking:      { browL:"M54 87 Q62 82 70 86", browR:"M90 85 Q98 82 106 87", eyeRy:4.5, eyeLy:4.5, mouth:"thinking", blush:0,   think:true,  sweat:false },
  warm:          { browL:"M54 90 Q62 86 70 89", browR:"M90 89 Q98 86 106 90", eyeRy:4,   eyeLy:4,   mouth:"warm",     blush:.5,  think:false, sweat:false },
  skeptical:     { browL:"M53 86 Q62 81 71 85", browR:"M90 88 Q98 85 106 89", eyeRy:4,   eyeLy:5.5, mouth:"skeptical",blush:0,   think:false, sweat:false },
  serious:       { browL:"M53 87 L71 89",        browR:"M90 89 L108 87",       eyeRy:5.5, eyeLy:5.5, mouth:"serious",  blush:0,   think:false, sweat:false },
  uncomfortable: { browL:"M54 89 Q62 93 70 89", browR:"M90 89 Q98 93 106 89", eyeRy:5.5, eyeLy:5.5, mouth:"uncomf",   blush:.35, think:false, sweat:true  },
};

// ─── UI click sound — short synthesized tone for selection moments (lang,
// mode, intensity, scenario picks), generated on a shared AudioContext so
// there's no audio asset to host.
let _sfxCtx = null;
function getSfxCtx() {
  if (!_sfxCtx) _sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_sfxCtx.state === "suspended") _sfxCtx.resume();
  return _sfxCtx;
}
function playSfx(name) {
  try {
    const ctx = getSfxCtx();
    const t = ctx.currentTime;
    if (name === "select") {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(660, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.13);
    }
  } catch { /* no audio context available */ }
}

function darken(hex, amt) {
  try { let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `#${Math.max(0,r-amt).toString(16).padStart(2,"0")}${Math.max(0,g-amt).toString(16).padStart(2,"0")}${Math.max(0,b-amt).toString(16).padStart(2,"0")}`; } catch { return hex; }
}
function lighten(hex, amt) {
  try { let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `#${Math.min(255,r+amt).toString(16).padStart(2,"0")}${Math.min(255,g+amt).toString(16).padStart(2,"0")}${Math.min(255,b+amt).toString(16).padStart(2,"0")}`; } catch { return hex; }
}
// Blends hex toward white by fraction t (0-1) — used for soft gradient highlight stops.
function tint(hex, t) {
  try { let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.round(r+(255-r)*t); g=Math.round(g+(255-g)*t); b=Math.round(b+(255-b)*t);
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`; } catch { return hex; }
}

// SVG <defs> ids (outfitGrad, hairGrad, etc.) below are plain string literals.
// When multiple characters render on the same page (e.g. the gallery, or the
// living-room scene with two characters at once), the browser resolves
// url(#id) document-wide, so every instance would pick up whichever
// character's gradient happened to be defined first. Each call gets its own
// numeric suffix appended to every def id (and matching url(#...) ref) right
// before returning, so gradients never collide across simultaneously
// rendered characters.
let _svgUidCounter = 0;

function buildSVG(charOrKey, mood, isTalking, scene = "role") {
  const c = (typeof charOrKey === "object" && charOrKey !== null)
    ? charOrKey
    : (CHARS[charOrKey] || CHARS.default);
  const roleKey = c.roleKey || (typeof charOrKey === "string" ? charOrKey : "default");
  const isCoach = !!c.isCoach;
  const s = c.skin, h = c.hair, b = c.bodyColor;
  const md = MOOD_DATA[mood] || MOOD_DATA.neutral;
  const hairDark = isCoach ? "#B0AAA0" : darken(h, 25);

  // ── Hair ──────────────────────────────────────────────────────────────
  const hairStyle = c.hairStyle || (c.hairLong ? "long" : "short");
  const hairStyles = {
    long: `<ellipse cx="80" cy="46" rx="34" ry="20" fill="url(#hairGrad)"/>
       <rect x="46" y="46" width="68" height="22" fill="url(#hairGrad)"/>
       <ellipse cx="47" cy="88" rx="11" ry="34" fill="url(#hairGrad)"/>
       <ellipse cx="113" cy="88" rx="11" ry="34" fill="url(#hairGrad)"/>
       <ellipse cx="80" cy="130" rx="34" ry="14" fill="url(#hairGrad)" opacity=".7"/>`,
   romantic_long: `
  <ellipse cx="80" cy="46" rx="34" ry="20" fill="url(#hairGrad)"/>
  <rect x="46" y="46" width="68" height="22" fill="url(#hairGrad)"/>
  <ellipse cx="50" cy="82" rx="12" ry="26" fill="url(#hairGrad)"/>
  <ellipse cx="110" cy="82" rx="12" ry="26" fill="url(#hairGrad)"/>
`,
    bun: `<ellipse cx="80" cy="46" rx="33" ry="19" fill="url(#hairGrad)"/>
       <rect x="47" y="46" width="66" height="21" fill="url(#hairGrad)"/>
       <ellipse cx="46" cy="74" rx="9" ry="22" fill="url(#hairGrad)"/>
       <ellipse cx="114" cy="74" rx="9" ry="22" fill="url(#hairGrad)"/>
       <circle cx="80" cy="30" r="13" fill="url(#hairGrad)"/>`,
   long_flowing: `
  <!-- Top hair -->
  <ellipse cx="80" cy="46" rx="34" ry="20" fill="url(#hairGrad)"/>
  <rect x="46" y="46" width="68" height="22" fill="url(#hairGrad)"/>

  <!-- Long side hair -->
  <ellipse cx="48" cy="96" rx="13" ry="44" fill="url(#hairGrad)"/>
  <ellipse cx="112" cy="96" rx="13" ry="44" fill="url(#hairGrad)"/>

  <!-- Lower hair ends -->
  <ellipse cx="60" cy="158" rx="12" ry="18" fill="url(#hairGrad)" opacity=".9"/>
  <ellipse cx="100" cy="158" rx="12" ry="18" fill="url(#hairGrad)" opacity=".9"/>
`,
    soft_fringe: `
  <ellipse cx="80" cy="46" rx="34" ry="18" fill="url(#hairGrad)"/>
  <rect x="46" y="46" width="68" height="18" fill="url(#hairGrad)"/>

  <path
    d="M48 48
       Q56 58 64 54
       Q72 62 80 58
       Q88 62 96 54
       Q104 58 112 48
       Z"
    fill="url(#hairGrad)"
  />
`,
    bald: `
  <ellipse
    cx="80"
    cy="42"
    rx="20"
    ry="8"
    fill="#000"
    opacity=".05"
  />
`,
    faux: `<ellipse cx="80" cy="46" rx="34" ry="19" fill="url(#hairGrad)"/>
       <rect x="46" y="46" width="68" height="22" fill="url(#hairGrad)"/>
       <ellipse cx="47" cy="72" rx="10" ry="18" fill="url(#hairGrad)"/>
       <ellipse cx="113" cy="72" rx="10" ry="18" fill="url(#hairGrad)"/>`,
    short: `<ellipse cx="80" cy="47" rx="33" ry="18" fill="url(#hairGrad)"/>
       <rect x="47" y="47" width="66" height="22" fill="url(#hairGrad)"/>`,
    buzz: `<ellipse cx="80" cy="48" rx="31" ry="14" fill="url(#hairGrad)"/>
       <rect x="49" y="48" width="62" height="14" fill="url(#hairGrad)"/>`,
    quiff: `<ellipse cx="80" cy="48" rx="32" ry="15" fill="url(#hairGrad)"/>
       <rect x="48" y="48" width="64" height="18" fill="url(#hairGrad)"/>
       <path d="M62 34 Q80 18 98 34 Q86 28 80 30 Q74 28 62 34Z" fill="url(#hairGrad)"/>`,
    messy: `<ellipse cx="80" cy="47" rx="33" ry="17" fill="url(#hairGrad)"/>
       <rect x="47" y="47" width="66" height="20" fill="url(#hairGrad)"/>
       <path d="M50 38 L56 28 L60 40Z" fill="url(#hairGrad)"/>
       <path d="M72 32 L78 22 L82 33Z" fill="url(#hairGrad)"/>
       <path d="M96 38 L104 30 L100 42Z" fill="url(#hairGrad)"/>`,
  };
  const hairSVG = isCoach
    ? `<ellipse cx="80" cy="47" rx="34" ry="17" fill="url(#hairGrad)"/>
       <rect x="46" y="47" width="68" height="20" fill="url(#hairGrad)"/>
       <ellipse cx="80" cy="47" rx="34" ry="17" fill="url(#hairGrad)" opacity=".5"/>
       <ellipse cx="46" cy="68" rx="8" ry="14" fill="url(#hairGrad)"/>
       <ellipse cx="114" cy="68" rx="8" ry="14" fill="url(#hairGrad)"/>`
    : (hairStyles[hairStyle] || hairStyles.short);

  // ── Glasses ───────────────────────────────────────────────────────────
  const glassesColor = isCoach ? "url(#goldGrad)" : "#4A3828"; // gold for coach
  const glassesSVG = c.glasses
    ? `<ellipse cx="65" cy="86" rx="13" ry="10" fill="none" stroke="${glassesColor}" stroke-width="2.5"/>
       <ellipse cx="95" cy="86" rx="13" ry="10" fill="none" stroke="${glassesColor}" stroke-width="2.5"/>
       <line x1="78" y1="86" x2="82" y2="86" stroke="${glassesColor}" stroke-width="2"/>
       <line x1="52" y1="84" x2="44" y2="82" stroke="${glassesColor}" stroke-width="2"/>
       <line x1="108" y1="84" x2="116" y2="82" stroke="${glassesColor}" stroke-width="2"/>` : "";

  // ── Beard / wrinkles ─────────────────────────────────────────────────
  const beardSVG = c.beard
    ? `<ellipse cx="80" cy="116" rx="22" ry="10" fill="#D0CCC5"/>
       <path d="M58 110 Q80 124 102 110" fill="#D0CCC5"/>` : "";

  const wrinklesSVG = isCoach
    ? `<path d="M52 98 Q57 95 62 97" stroke="#B0907A" stroke-width="1" fill="none" opacity=".5"/>
       <path d="M98 97 Q103 95 108 98" stroke="#B0907A" stroke-width="1" fill="none" opacity=".5"/>
       <path d="M65 120 Q80 124 95 120" stroke="#B0907A" stroke-width="1" fill="none" opacity=".4"/>` : "";

  // ── Eyebrows ──────────────────────────────────────────────────────────
  const browsSVG = `<path d="${md.browL}" stroke="${hairDark}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
                    <path d="${md.browR}" stroke="${hairDark}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;

  // ── Eyes ──────────────────────────────────────────────────────────────
  const eyeSquint = mood === "amused" || mood === "warm";
  const [ex, ely, ery] = [6, md.eyeLy, md.eyeRy];
  const eyeLx = isCoach ? 65 : 62;
  const eyeRx = isCoach ? 95 : 98;
  const eyeL = eyeSquint
    ? `<path d="M${eyeLx-ex} 86 Q${eyeLx} ${86-ely} ${eyeLx+ex} 86 Q${eyeLx} ${86+ely*.55} ${eyeLx-ex} 86Z" fill="#1A1209"/>`
    : `<ellipse cx="${eyeLx}" cy="86" rx="${ex}" ry="${ely}" fill="#1A1209"/>`;
  const eyeR = eyeSquint
    ? `<path d="M${eyeRx-ex} 86 Q${eyeRx} ${86-ery} ${eyeRx+ex} 86 Q${eyeRx} ${86+ery*.55} ${eyeRx-ex} 86Z" fill="#1A1209"/>`
    : `<ellipse cx="${eyeRx}" cy="86" rx="${ex}" ry="${ery}" fill="#1A1209"/>`;

  // ── Nose ──────────────────────────────────────────────────────────────
  const noseSVG = `<path d="M77 97 Q80 102 83 97" stroke="#9A7860" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                   <circle cx="76" cy="100" r="1.5" fill="${darken(s,8)}" opacity=".45"/>
                   <circle cx="84" cy="100" r="1.5" fill="${darken(s,8)}" opacity=".45"/>`;

  // ── Mouth ─────────────────────────────────────────────────────────────
  let mouthSVG;
  const my = 110;
  if (isTalking) {
    mouthSVG = `<ellipse cx="80" cy="${my+3}" rx="11" ry="9" fill="#3A1A0A"/>
                <ellipse cx="80" cy="${my+3}" rx="8.5" ry="5.5" fill="#5A2A1A"/>
                <path d="M69 ${my+3} Q80 ${my-1} 91 ${my+3}" stroke="#7A4030" stroke-width="1" fill="none"/>`;
  } else {
    mouthSVG = {
      neutral:   `<path d="M68 ${my} Q80 ${my+5} 92 ${my}" stroke="#8A6050" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      surprised: `<ellipse cx="80" cy="${my+4}" rx="9" ry="8.5" fill="#3A1A0A"/>`,
      amused:    `<path d="M66 ${my-2} Q80 ${my+13} 94 ${my-2}" stroke="#C87A60" stroke-width="3" fill="none" stroke-linecap="round"/>
                  <path d="M66 ${my-2} Q80 ${my+13} 94 ${my-2}" fill="#E89070" opacity=".28"/>`,
      thinking:  `<path d="M70 ${my+2} Q82 ${my} 92 ${my+4}" stroke="#8A6050" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      warm:      `<path d="M66 ${my-1} Q80 ${my+11} 94 ${my-1}" stroke="#C87A60" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      skeptical: `<path d="M68 ${my+2} Q79 ${my} 92 ${my+5}" stroke="#8A6050" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      serious:   `<line x1="68" y1="${my+1}" x2="92" y2="${my+1}" stroke="#6A4030" stroke-width="3" stroke-linecap="round"/>`,
      uncomf:    `<path d="M68 ${my+4} Q80 ${my-2} 92 ${my+4}" stroke="#8A6050" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                  <path d="M92 ${my+4} Q95 ${my+7} 98 ${my+4}" stroke="#8A6050" stroke-width="2" fill="none"/>`,
    }[md.mouth] || "";
  }

  // ── Blush / Think / Sweat ─────────────────────────────────────────────
  const blushSVG = md.blush > 0
    ? `<ellipse cx="52" cy="97" rx="11" ry="6.5" fill="#E87060" opacity="${md.blush}"/>
       <ellipse cx="108" cy="97" rx="11" ry="6.5" fill="#E87060" opacity="${md.blush}"/>` : "";
  const thinkSVG = md.think
    ? `<circle cx="108" cy="68" r="4" fill="${s}" stroke="#C0A890" stroke-width="1.5"/>
       <circle cx="115" cy="59" r="3.5" fill="${s}" stroke="#C0A890" stroke-width="1.5"/>
       <circle cx="121" cy="51" r="6.5" fill="${s}" stroke="#C0A890" stroke-width="1.5"/>
       <text x="121" y="54.5" font-size="9" fill="#6A5040" text-anchor="middle" font-weight="bold">?</text>` : "";
  const sweatSVG = md.sweat
    ? `<path d="M108 62 Q111 69 107.5 71 Q103.5 69 108 62Z" fill="#A8C8E8" opacity=".88"/>` : "";

  // ── Scene props + body per role ───────────────────────────────────────
  // Arms — shoulder connector + upper arm + forearm (hand kept separate so
  // social/sofa roles can render hands in frontProps, on top of the sofa)
  const armLNoHand = `<ellipse cx="36" cy="136" rx="10" ry="8" fill="url(#outfitGrad)"/>
    <rect x="26" y="132" rx="8" width="20" height="36" fill="url(#outfitGrad)"/>
    <rect x="22" y="164" rx="6" width="18" height="28" fill="url(#outfitGrad)"/>`;
  const armRBaseNoHand = `<ellipse cx="124" cy="136" rx="10" ry="8" fill="url(#outfitGrad)"/>
    <rect x="114" y="132" rx="8" width="20" height="36" fill="url(#outfitGrad)"/>
    <rect x="120" y="164" rx="6" width="18" height="28" fill="url(#outfitGrad)"/>`;
  const handL = `<ellipse cx="30" cy="196" rx="11" ry="9" fill="url(#faceGrad)"/>
    <path d="M24 193 Q30 197 36 193" stroke="${darken(s,16)}" stroke-width="0.8" fill="none" opacity=".5"/>
    <path d="M24 199 Q30 202 36 199" stroke="${darken(s,16)}" stroke-width="0.8" fill="none" opacity=".4"/>`;
  const handR = `<ellipse cx="130" cy="196" rx="11" ry="9" fill="url(#faceGrad)"/>
    <path d="M124 193 Q130 197 136 193" stroke="${darken(s,16)}" stroke-width="0.8" fill="none" opacity=".5"/>
    <path d="M124 199 Q130 202 136 199" stroke="${darken(s,16)}" stroke-width="0.8" fill="none" opacity=".4"/>`;
  const armL = `${armLNoHand}${handL}`;
  // Gesture wraps right arm during talking for expressive roles
  const gestureRoles = ["interviewer","journalist","opponent","prosecutor","negotiator","ceo","executive","friend_female","best_friend","friend_male","acquirer"];
  const wrapGesture = (inner) => (isTalking && gestureRoles.includes(roleKey))
    ? `<g style="animation:gesturePoint 3s ease-in-out infinite;transform-origin:129px 132px">${inner}</g>`
    : inner;
  const armRBase = `${armRBaseNoHand}${handR}`;
  const armR = wrapGesture(armRBase);
  // Arms without hands — used by sofa/social roles whose hands render later in frontProps
  const armRNoHand = wrapGesture(armRBaseNoHand);

  // Legs + feet — larger, visible below seated/standing characters. Pants
  // get their own gradient (highlight/midtone/shadow) plus a center-seam
  // crease for fold, and shoes a rim shine + sole band so the two garment
  // layers read clearly instead of as flat blobs.
  const legsFeetSVG = `<rect x="54" y="204" width="14" height="20" rx="4" fill="url(#pantsGrad)"/>
    <rect x="92" y="204" width="14" height="20" rx="4" fill="url(#pantsGrad)"/>
    <rect x="59.5" y="206" width="3" height="16" rx="1.5" fill="${darken(b,38)}" opacity=".5"/>
    <rect x="97.5" y="206" width="3" height="16" rx="1.5" fill="${darken(b,38)}" opacity=".5"/>
    <ellipse cx="62" cy="222" rx="18" ry="8" fill="${darken(b,20)}"/>
    <ellipse cx="98" cy="222" rx="18" ry="8" fill="${darken(b,20)}"/>
    <ellipse cx="62" cy="219" rx="13" ry="3.5" fill="${lighten(b,18)}" opacity=".35"/>
    <ellipse cx="98" cy="219" rx="13" ry="3.5" fill="${lighten(b,18)}" opacity=".35"/>
    <ellipse cx="62" cy="227" rx="17" ry="3" fill="${darken(b,34)}" opacity=".8"/>
    <ellipse cx="98" cy="227" rx="17" ry="3" fill="${darken(b,34)}" opacity=".8"/>`;

  // Outfit accent — small button/stripe/pocket variation layered onto the torso
  const outfitAccent = (cx, topY, h2) => {
    const style = c.outfitStyle || 0;
    if (style === 1) return `<rect x="${cx-2.5}" y="${topY}" width="5" height="${h2}" fill="${lighten(b,10)}" opacity=".4"/>`;
    if (style === 2) return [0,1,2].map(i => `<circle cx="${cx}" cy="${topY+10+i*14}" r="2" fill="${lighten(b,25)}"/>`).join("");
    return "";
  };

  let bodySVG = "";
  let backProps = "";
  let frontProps = "";
  let hideLegs = false;

  if (isCoach) {
    // Grey sweater — V-neck with texture suggestion
    bodySVG = `
      <rect x="38" y="128" rx="14" width="84" height="92" fill="url(#outfitGrad)"/>
      <path d="M38 178 h84 v28 a14 14 0 0 1 -14 14 h-56 a14 14 0 0 1 -14 -14 Z" fill="${darken(b,30)}"/>
      <path d="M62 128 L80 148 L98 128 L90 128 L80 142 L70 128Z" fill="${darken(b,15)}"/>
      <ellipse cx="80" cy="145" rx="12" ry="6" fill="${darken(b,10)}" opacity=".4"/>
      ${armL}${armR}`;
    // Small book in hand — professor touch
    frontProps = `
      <rect x="118" y="162" rx="3" width="28" height="36" fill="#8A7060"/>
      <rect x="120" y="164" rx="2" width="24" height="32" fill="#9A8070"/>
      <line x1="124" y1="170" x2="142" y2="170" stroke="#C8B8A0" stroke-width="1"/>
      <line x1="124" y1="176" x2="142" y2="176" stroke="#C8B8A0" stroke-width="1"/>
      <line x1="124" y1="182" x2="136" y2="182" stroke="#C8B8A0" stroke-width="1"/>`;
  } else {
    switch(roleKey) {
      // ── Formal desk roles ──────────────────────────────────────────────
      case "interviewer": case "reviewer": case "auditor": case "manager":
      case "panelist": case "regulator": case "commissioner": case "customer_service":
      case "defense_lawyer": case "investigator": case "official":
      case "dean": case "professor_academic":
        backProps = `
          <rect x="25" y="95" width="110" height="10" rx="4" fill="#2A1E14" stroke="#3A2A1C" stroke-width="1"/>
          <rect x="25" y="105" width="6" height="80" fill="#2A1E14"/>
          <rect x="129" y="105" width="6" height="80" fill="#2A1E14"/>
          <rect x="22" y="182" width="116" height="12" rx="3" fill="#2A1E14"/>`;
        bodySVG = `<rect x="40" y="128" rx="8" width="80" height="92" fill="url(#outfitGrad)"/>
          <path d="M58 128 L80 150 L102 128 L94 128 L80 144 L66 128Z" fill="#243A52"/>
          <rect x="68" y="128" width="24" height="26" fill="#EAE7E0"/>
          ${outfitAccent(80,154,50)}
          ${armL}${armR}`;
        frontProps = `
          <rect x="-10" y="190" width="180" height="14" rx="2" fill="#3A2810" stroke="#4A3818" stroke-width="1"/>
          <rect x="-10" y="204" width="180" height="36" fill="#2E2008"/>
          <rect x="5" y="204" width="8" height="34" fill="#241A08"/>
          <rect x="147" y="204" width="8" height="34" fill="#241A08"/>
          <rect x="20" y="183" rx="2" width="36" height="14" fill="#E8DCC0" opacity=".9"/>
          <rect x="24" y="180" rx="2" width="30" height="10" fill="#F0E8D0" opacity=".9"/>`;
        hideLegs = true; break;

      // ── Judge / legal bench ───────────────────────────────────────────
      case "judge": case "prosecutor": case "cross_examiner":
        backProps = `
          <rect x="20" y="88" width="120" height="14" rx="4" fill="#1A1208"/>`;
        bodySVG = `<rect x="40" y="128" rx="8" width="80" height="92" fill="url(#outfitGrad)"/>
          <path d="M58 128 L80 150 L102 128 L94 128 L80 144 L66 128Z" fill="#243224"/>
          ${outfitAccent(80,150,55)}
          ${armL}${armR}`;
        frontProps = `
          <rect x="-10" y="178" width="180" height="16" rx="2" fill="#3A2810" stroke="#5A3E18" stroke-width="2"/>
          <rect x="-10" y="194" width="180" height="46" fill="#2A1C08"/>
          <rect x="0" y="200" width="160" height="30" fill="none" stroke="#4A3818" stroke-width="1"/>
          <rect x="95" y="160" rx="3" width="8" height="18" fill="#6A5030"/>
          <ellipse cx="99" cy="159" rx="8" ry="5" fill="#7A6040" style="transform:rotate(-30deg);transform-origin:99px 169px"/>
          <rect x="30" y="184" width="50" height="6" fill="#C8A040" opacity=".4"/>`;
        hideLegs = true; break;

      // ── Executive / conference table ──────────────────────────────────
      case "ceo": case "executive": case "negotiator": case "diplomat":
      case "acquirer": case "board_member": case "investor":
      case "partner": case "shareholder":
        backProps = `
          <rect x="15" y="90" width="130" height="16" rx="6" fill="#1A1614"/>
          <rect x="15" y="106" width="7" height="82" fill="#1A1614"/>
          <rect x="138" y="106" width="7" height="82" fill="#1A1614"/>
          <rect x="40" y="82" width="80" height="14" rx="6" fill="#1E1A18"/>`;
        bodySVG = `<rect x="40" y="128" rx="8" width="80" height="92" fill="url(#outfitGrad)"/>
          <path d="M58 128 L80 148 L102 128 L94 128 L80 142 L66 128Z" fill="#243A22"/>
          <path d="M77 128 L80 138 L83 128" fill="${c.tie||"#8AB87A"}"/>
          ${outfitAccent(80,150,55)}
          ${armL}${armR}`;
        frontProps = `
          <rect x="-20" y="188" width="200" height="12" rx="2" fill="#2A2218"/>
          <rect x="-20" y="188" width="200" height="2" fill="#3E3428"/>
          <rect x="-20" y="200" width="200" height="40" fill="#221A12"/>
          <rect x="118" y="178" width="8" height="14" fill="none" stroke="#4A5060" stroke-width="1"/>
          <ellipse cx="122" cy="178" rx="6" ry="2" fill="none" stroke="#4A5060" stroke-width="1"/>`;
        hideLegs = true; break;

      // ── Social casual — sofa seating ───────────────────────────────────
      case "friend_female": case "friend_male": case "best_friend": case "crush":
      case "date": case "romantic_interest": case "ex_partner": case "classmate":
      case "teman_ospek": case "new_acquaintance": case "neighbor": case "sibling":
      case "blind_date": case "colleague": case "stranger":
        if (scene === "livingroom") {
        backProps = `
          <rect x="8" y="108" width="144" height="14" rx="6" fill="#241A14" stroke="#2E2018" stroke-width="1.5"/>
          <rect x="8" y="122" width="8" height="68" rx="3" fill="#1E1410"/>
          <rect x="144" y="122" width="8" height="68" rx="3" fill="#1E1410"/>`;
        bodySVG = `<rect x="42" y="130" rx="14" width="76" height="90" fill="url(#outfitGrad)"/>
          <path d="M58 130 Q80 141 102 130" fill="none" stroke="#C890A0" stroke-width="2.5"/>
          ${outfitAccent(80,150,50)}
          ${armLNoHand}${armRNoHand}`;
        frontProps = `
          <rect x="6" y="186" width="148" height="30" rx="8" fill="#2A1E18" stroke="#3A2820" stroke-width="1.5"/>
          <rect x="14" y="190" width="132" height="2" rx="1" fill="#362418" opacity="0.6"/>
          <rect x="6" y="168" width="20" height="52" rx="6" fill="#2A1E18" stroke="#3A2820" stroke-width="1"/>
          <rect x="134" y="168" width="20" height="52" rx="6" fill="#2A1E18" stroke="#3A2820" stroke-width="1"/>
          <rect x="9" y="172" width="14" height="18" rx="3" fill="#342818" opacity="0.7"/>
          <rect x="137" y="172" width="14" height="18" rx="3" fill="#342818" opacity="0.7"/>
          <rect x="54" y="186" width="14" height="44" rx="5" fill="${darken(b,18)}"/>
          <rect x="92" y="186" width="14" height="44" rx="5" fill="${darken(b,18)}"/>
          <ellipse cx="62" cy="222" rx="18" ry="8" fill="${darken(b,28)}"/>
          <ellipse cx="98" cy="222" rx="18" ry="8" fill="${darken(b,28)}"/>
         ${handL}${handR}`;
hideLegs = true;

        }else if (
  roleKey === "crush" ||
  roleKey === "date" ||
  roleKey === "romantic_interest"
) {

  backProps = `
    <!-- Hanging lamp wire -->
    <line
      x1="120"
      y1="0"
      x2="120"
      y2="32"
      stroke="#705020"
      stroke-width="2"
    />

    <!-- Warm lamp -->
    <circle
      cx="120"
      cy="40"
      r="8"
      fill="#D4A020"
    />

    <!-- Lamp glow -->
    <circle
      cx="120"
      cy="40"
      r="28"
      fill="#D4A020"
      opacity="0.12"
    />
  `;

  bodySVG = `
    <rect
      x="44"
      y="120"
      rx="14"
      width="72"
      height="58"
      fill="url(#outfitGrad)"
    />

    <path
      d="M58 120 Q80 131 102 120"
      fill="none"
      stroke="#C890A0"
      stroke-width="2.5"
    />

    ${outfitAccent(80,138,50)}

    ${armLNoHand}
    ${armRNoHand}
  `;

frontProps = `
  <!-- Large cafe table -->

  <ellipse
    cx="80"
    cy="194"
    rx="74"
    ry="16"
    fill="#4A3124"
  />

  <!-- Table thickness -->

  <ellipse
    cx="80"
    cy="200"
    rx="74"
    ry="16"
    fill="#3A2418"
  />

  <!-- Table leg -->

  <rect
    x="76"
    y="198"
    width="8"
    height="10"
    fill="#3A2418"
  />

  <!-- Coffee cup -->

  <rect
    x="118"
    y="176"
    width="8"
    height="6"
    rx="1"
    fill="#D8D5CE"
  />

  <!-- Hands render LAST so they stay above table -->

  ${handL}
  ${handR}
`;

  hideLegs = true;
}
else {

  backProps = `
    <!-- Grass -->
    <rect
      x="0"
      y="185"
      width="160"
      height="55"
      fill="#3F5338"
    />

    <!-- Large picnic blanket -->
    <rect
      x="18"
      y="166"
      width="124"
      height="40"
      rx="6"
      fill="#8B5A7A"
    />

    <!-- Tree trunk -->
    <rect
      x="118"
      y="70"
      width="10"
      height="115"
      fill="#5A3A20"
    />

    <!-- Large canopy -->
    <circle
      cx="123"
      cy="55"
      r="52"
      fill="#4E6A43"
    />

    <circle
      cx="90"
      cy="65"
      r="34"
      fill="#58744B"
    />

    <circle
      cx="148"
      cy="72"
      r="28"
      fill="#58744B"
    />
  `;

  bodySVG = `
    <!-- Half body -->
    <rect
      x="44"
      y="120"
      rx="14"
      width="72"
      height="58"
      fill="url(#outfitGrad)"
    />

    <path
      d="M58 120 Q80 131 102 120"
      fill="none"
      stroke="#C890A0"
      stroke-width="2.5"
    />

    ${outfitAccent(80,138,50)}

    ${armLNoHand}
    ${armRNoHand}
  `;

  frontProps = `
    <!-- Cross-legged pose -->

    <ellipse
      cx="56"
      cy="188"
      rx="26"
      ry="10"
      fill="${darken(b,18)}"
    />

    <ellipse
      cx="104"
      cy="188"
      rx="26"
      ry="10"
      fill="${darken(b,18)}"
    />

    <ellipse
      cx="52"
      cy="196"
      rx="14"
      ry="5"
      fill="${darken(b,28)}"
    />

    <ellipse
      cx="108"
      cy="196"
      rx="14"
      ry="5"
      fill="${darken(b,28)}"
    />

    ${handL}
    ${handR}
  `;

  hideLegs = true;
}

break;
        
      // ── Parent / grandparent / mentor — armchair ───────────────────────
      case "parent": case "grandparent": case "mentor": case "senior":
      case "pak_rt": case "calon_mertua": case "dosen_pembimbing":
        backProps = `
          <rect x="5" y="104" width="150" height="16" rx="8" fill="#2A1C10"/>
          <rect x="5" y="120" width="8" height="68" fill="#221508"/>
          <rect x="147" y="120" width="8" height="68" fill="#221508"/>
          <rect x="5" y="154" width="22" height="36" rx="6" fill="#2A1C10"/>
          <rect x="133" y="154" width="22" height="36" rx="6" fill="#2A1C10"/>`;
        bodySVG = `<rect x="40" y="128" rx="10" width="80" height="92" fill="url(#outfitGrad)"/>
          <path d="M58 128 Q80 137 102 128" fill="none" stroke="#5A7050" stroke-width="2"/>
          ${armL}${armR}`;
        frontProps = `
          <rect x="5" y="186" width="150" height="20" rx="6" fill="#2A1C10"/>
          <rect x="140" y="176" width="30" height="5" fill="#5A4020"/>
          <rect x="152" y="181" width="4" height="14" fill="#3A2A14"/>
          <ellipse cx="148" cy="174" rx="7" ry="3" fill="#C8A040" opacity=".7"/>
          <rect x="143" y="172" width="10" height="4" rx="1" fill="#E8D0A0"/>`; break;

      // ── Standing with mic (journalist style) ──────────────────────────
      case "journalist": case "critic": case "media_audience":
        bodySVG = `<rect x="40" y="128" rx="8" width="80" height="92" fill="url(#outfitGrad)"/>
          <path d="M40 178 h80 v28 a8 8 0 0 1 -8 8 h-64 a8 8 0 0 1 -8 -8 Z" fill="${darken(b,30)}"/>
          <rect x="88" y="138" rx="3" width="24" height="16" fill="#EAE0D0"/>
          <rect x="90" y="140" rx="2" width="20" height="6" fill="#BC7A7A"/>
          ${outfitAccent(60,148,28)}
          ${armL}${armR}`;
        frontProps = `
          <rect x="118" y="148" rx="4" width="8" height="28" fill="#2A2A2A" style="transform:rotate(-15deg);transform-origin:122px 162px"/>
          <ellipse cx="120" cy="148" rx="9" ry="11" fill="#3A3A3A" style="transform:rotate(-15deg);transform-origin:120px 148px"/>
          <ellipse cx="120" cy="148" rx="6" ry="7" fill="#222" style="transform:rotate(-15deg);transform-origin:120px 148px"/>
          <rect x="110" y="120" width="30" height="22" fill="#1A1A1A"/>
          <rect x="122" y="142" width="6" height="8" fill="#1A1A1A"/>`; break;

      // ── Opponent — assertive pose ─────────────────────────────────────
      case "opponent":
        backProps = `<rect x="20" y="100" width="120" height="10" rx="4" fill="#1E1814"/>`;
        bodySVG = `<rect x="40" y="128" rx="8" width="80" height="92" fill="url(#outfitGrad)"/>
          <path d="M40 178 h80 v28 a8 8 0 0 1 -8 8 h-64 a8 8 0 0 1 -8 -8 Z" fill="${darken(b,30)}"/>
          <path d="M58 128 L80 150 L102 128 L94 128 L80 144 L66 128Z" fill="#1A120A"/>
          ${outfitAccent(80,150,55)}
          ${armL}${armR}`; break;

      // ── Default social/casual ─────────────────────────────────────────
      default:
        backProps = `<rect x="20" y="100" width="120" height="10" rx="4" fill="#1E1814"/>`;
        bodySVG = `<rect x="42" y="130" rx="12" width="76" height="90" fill="url(#outfitGrad)"/>
          <path d="M42 176 h76 v28 a12 12 0 0 1 -12 12 h-52 a12 12 0 0 1 -12 -12 Z" fill="${darken(b,30)}"/>
          <path d="M60 130 Q80 142 100 130" fill="none" stroke="${darken(b,10)}" stroke-width="1.5"/>
          ${outfitAccent(80,150,50)}
          ${armL}${armR}`;
    }
  }

  // Legs/feet render in frontProps above seat/desk fronts, unless hidden behind furniture or already drawn in bodySVG
  if (!hideLegs) { frontProps = `${frontProps}${legsFeetSVG}`; }

  // ── Gesture arm selection per role ────────────────────────────────────
  const gestureAnim = isTalking ? {
    interviewer: "gesturePoint 3.5s ease-in-out infinite",
    journalist:  "gesturePoint 2.8s ease-in-out infinite",
    opponent:    "gesturePoint 2.5s ease-in-out infinite",
    prosecutor:  "gesturePoint 3s ease-in-out infinite",
    negotiator:  "gestureNegotiate 4s ease-in-out infinite",
    ceo:         "gestureNegotiate 4.5s ease-in-out infinite",
    executive:   "gestureNegotiate 4.5s ease-in-out infinite",
    friend_female:"gestureOpen 3s ease-in-out infinite",
    best_friend: "gestureOpen 2.8s ease-in-out infinite",
    friend_male: "gestureOpen 3.5s ease-in-out infinite",
  }[roleKey] || null : null;

  // Blink timing — slightly different per character so they don't all blink at once
  const blinkDuration = 3.8 + (roleKey?.length || 0) % 3 * 0.6;
  const blinkAnim = `blink ${blinkDuration}s ease-in-out infinite`;
  const eyeAnim = isTalking ? null : `eyeDrift ${5 + (roleKey?.length || 0) % 4}s ease-in-out infinite`;

  // Brow micro-flash on surprised/amused
  const browAnim = (mood === "surprised" || mood === "amused")
    ? "browFlash 2.5s ease-in-out infinite"
    : null;

  const svg = `<svg viewBox="0 0 160 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;overflow:visible">
    <defs>
      <linearGradient id="outfitGrad" x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stop-color="${tint(b,0.16)}"/>
        <stop offset="22%" stop-color="${tint(b,0.06)}"/>
        <stop offset="55%" stop-color="${b}"/>
        <stop offset="100%" stop-color="${darken(b,32)}"/>
      </linearGradient>
      <linearGradient id="pantsGrad" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stop-color="${lighten(b,14)}"/>
        <stop offset="35%" stop-color="${darken(b,12)}"/>
        <stop offset="100%" stop-color="${darken(b,30)}"/>
      </linearGradient>
      <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${tint(h,0.22)}"/>
        <stop offset="50%" stop-color="${h}"/>
        <stop offset="100%" stop-color="${darken(h,26)}"/>
      </linearGradient>
      <radialGradient id="faceGrad" cx="34%" cy="28%" r="78%">
        <stop offset="0%" stop-color="${lighten(s,28)}"/>
        <stop offset="45%" stop-color="${s}"/>
        <stop offset="100%" stop-color="${darken(s,22)}"/>
      </radialGradient>
      <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity=".42"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffec99"/>
        <stop offset="50%" stop-color="#daa520"/>
        <stop offset="100%" stop-color="#6b4c0a"/>
      </linearGradient>
      <filter id="figureDepth" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="linearRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
        <feOffset in="blur" dx="0" dy="5" result="offset"/>
        <feFlood flood-color="#06040a" flood-opacity=".4" result="color"/>
        <feComposite in="color" in2="offset" operator="in" result="shadow"/>
        <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <ellipse cx="80" cy="232" rx="50" ry="10" fill="url(#groundShadow)"/>
    <g filter="url(#figureDepth)">
    ${backProps}
    ${bodySVG}
    <!-- Fabric shading streaks — torso only, kept above the garment fill but
         below the face so seated/desk roles whose body rect ends near the
         hem don't bleed shading onto props drawn afterward. -->
    <g opacity=".4" style="mix-blend-mode:multiply">
      <path d="M50 140 Q53 158 52 176" fill="none" stroke="${darken(b,38)}" stroke-width="6" stroke-linecap="round"/>
      <path d="M70 134 Q72 155 71 176" fill="none" stroke="${darken(b,38)}" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g opacity=".5" style="mix-blend-mode:screen">
      <path d="M92 134 Q94 155 93 176" fill="none" stroke="${tint(b,0.14)}" stroke-width="5" stroke-linecap="round"/>
      <path d="M110 140 Q112 158 109 176" fill="none" stroke="${tint(b,0.14)}" stroke-width="6" stroke-linecap="round"/>
    </g>
    <g opacity=".22" style="mix-blend-mode:multiply">
      <path d="M58 142 L66 174" stroke="${darken(b,30)}" stroke-width="0.6"/>
      <path d="M66 138 L74 172" stroke="${darken(b,30)}" stroke-width="0.6"/>
      <path d="M86 138 L94 172" stroke="${darken(b,30)}" stroke-width="0.6"/>
      <path d="M94 142 L102 174" stroke="${darken(b,30)}" stroke-width="0.6"/>
    </g>
    <ellipse cx="80" cy="120" rx="20" ry="7" fill="${darken(s,30)}" opacity=".3"/>
    <circle cx="80" cy="82" r="42" fill="url(#faceGrad)"/>
    <ellipse cx="64" cy="68" rx="14" ry="8" fill="#ffffff" opacity=".16"/>
    <path d="M60 100 Q80 108 100 100" stroke="${darken(s,14)}" stroke-width="1.2" fill="none" opacity=".22"/>
    ${hairSVG}
    <ellipse cx="68" cy="48" rx="16" ry="5" fill="#ffffff" opacity=".1"/>
    <ellipse cx="38" cy="86" rx="7" ry="9" fill="url(#faceGrad)"/>
    <ellipse cx="122" cy="86" rx="7" ry="9" fill="url(#faceGrad)"/>
    ${beardSVG}${glassesSVG}
    ${browsSVG && browAnim
      ? `<g style="animation:${browAnim}">${browsSVG}</g>`
      : browsSVG}
    <g style="animation:${eyeAnim||'none'}">
      <g style="animation:${blinkAnim};transform-origin:${eyeLx}px 86px">
        ${eyeL}
      </g>
      <g style="animation:${blinkAnim};transform-origin:${eyeRx}px 86px;animation-delay:.08s">
        ${eyeR}
      </g>
      <circle cx="${eyeLx+2}" cy="83" r="2" fill="white" opacity=".9"/>
      <circle cx="${eyeRx+2}" cy="83" r="2" fill="white" opacity=".9"/>
    </g>
    ${noseSVG}${mouthSVG}${blushSVG}${wrinklesSVG}
    ${thinkSVG}${sweatSVG}
    </g>
    ${frontProps}
  </svg>`;

  let out = svg;
  const _uid = ++_svgUidCounter;
  for (const id of ["outfitGrad", "pantsGrad", "hairGrad", "faceGrad", "groundShadow", "goldGrad", "figureDepth"]) {
    out = out.split(id).join(`${id}${_uid}`);
  }
  return out;
}

const PLAYLISTS = [
  { id: "rhrCG0Vtx3g", label: "Lofi",    desc: "Chill lofi beats" },
  { id: "KcTJHmrU2T0", label: "Malcolm", desc: "Jazz cafe vibes" },
  { id: "uHs1LlKspD8", label: "Weeknd",  desc: "Peaceful piano" },
  { id: "P6E5mLWj61Y", label: "Frank",   desc: "Ambient focus" },
  { id: "Bea0yLo4T_4", label: "SZA",     desc: "Study music" },
  { id: "EWq1VXEUGIU", label: "Daniel",  desc: "Night vibes" },
  { id: "6X_OEUFV0v4", label: "Piano",   desc: "Rain & lofi" },
  { id: "mIYzp5rcTvU", label: "Classic", desc: "Sleep sounds" },
];

// ─── Main component ────────────────────────────────────────────────────────
// ─── Globe3D (adapted from Aceternity UI — no Tailwind/next-themes in this
// project; markers are plain glowing points, no images, theme fixed dark). ──
const GLOBE_EARTH_TEXTURE = "https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg";
const GLOBE_BUMP_TEXTURE = "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png";

function globeLatLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function GlobeMarkerPoint({ lat, lng, radius, color }) {
  const pos = useMemo(() => globeLatLngToVector3(lat, lng, radius * 1.01), [lat, lng, radius]);
  return (
    <mesh position={pos}>
      <sphereGeometry args={[radius * 0.018, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// Roles drawn from at random for the little SVG characters standing on the
// globe's yellow dots — same generateChar/buildSVG pipeline as hero-char-row.
const GLOBE_MARKER_ROLES = ["interviewer","colleague","crush","negotiator","journalist","ceo","judge","mentor","friend_female","manager","stranger","senior"];

// Rough lat/lng → plausible ethnicity, just so a marker's character isn't
// wildly mismatched with the region it's sitting on (not meant to be precise).
function regionEthnicity(lat, lng) {
  if (lng > -100 && lng < -30 && lat < 15) return "latin";
  if (lng > -170 && lng < -50 && lat >= 15) return pick(["white","black","latin"]);
  if (lng > -25 && lng < 45 && lat > 35) return "european";
  if (lng > -20 && lng < 55 && lat <= 35 && lat > -35) return pick(["black","white"]);
  if (lng > 55 && lng < 100 && lat > 0) return "south_asian";
  if (lng > 100 && lng < 150 && lat > 20) return "east_asian";
  if (lng > 90 && lng < 141 && lat <= 20 && lat > -12) return "sea";
  if (lat < -10 && lng > 110) return "white";
  return pick(ETHNICITIES);
}

function GlobeCharacterMarker({ lat, lng, radius, charObj, role, hovered, onHover, onLeave, onTap }) {
  const pos = useMemo(() => globeLatLngToVector3(lat, lng, radius * 1.04), [lat, lng, radius]);
  const svg = useMemo(() => buildSVG(charObj, "neutral", false, "role"), [charObj]);
  return (
    <Html position={pos} center occlude transform={false} zIndexRange={[60, 0]} style={{ pointerEvents:"auto" }}>
      <div
        style={{ position:"relative", width:"22px", height:"28px", cursor:"pointer" }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={onTap}
      >
        {hovered && (
          <div
            style={{
              position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%)",
              marginBottom:"6px", background:"#0E0E0E", border:"1px solid #2A2520",
              padding:"6px 10px", whiteSpace:"nowrap", textAlign:"center", zIndex:50
            }}
          >
            <p style={{ fontFamily:"'Playfair Display',serif", fontSize:"11px", color: charObj.accent || "#C8A870", margin:0 }}>{charObj.name}</p>
            <p style={{ fontSize:"9px", color:"#C8A458", margin:"2px 0 0", textTransform:"capitalize" }}>{role.replace(/_/g," ")}</p>
          </div>
        )}
        <div style={{ width:"100%", height:"100%" }} dangerouslySetInnerHTML={{ __html: svg }}/>
      </div>
    </Html>
  );
}

function GlobeAtmosphere({ radius, color, intensity }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { atmosphereColor: { value: new THREE.Color(color) }, intensity: { value: intensity } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition;
      void main() { vNormal = normalize(normalMatrix * normal); vPosition = (modelViewMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 atmosphereColor; uniform float intensity; varying vec3 vNormal; varying vec3 vPosition;
      void main() { float fresnel = pow(1.0 - abs(dot(vNormal, normalize(-vPosition))), 2.0); gl_FragColor = vec4(atmosphereColor, fresnel * intensity); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false,
  }), [color, intensity]);
  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[radius, 48, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function RotatingGlobe({ radius, dots, markerColor }) {
  const groupRef = useRef(null);
  const [earthTexture, bumpTexture] = useTexture([GLOBE_EARTH_TEXTURE, GLOBE_BUMP_TEXTURE]);
  useMemo(() => { if (earthTexture) earthTexture.colorSpace = THREE.SRGBColorSpace; }, [earthTexture]);
  const markers = useMemo(() => {
    const seen = new Set(); const list = [];
    dots.forEach(d => {
      [d.start, d.end].forEach(p => {
        const key = `${p.lat},${p.lng}`;
        if (!seen.has(key)) { seen.add(key); list.push(p); }
      });
    });
    return list;
  }, [dots]);
  // One random character per marker, regenerated whenever the marker set changes (i.e. each reload).
  const markerChars = useMemo(() => markers.map(m => {
    const role = pick(GLOBE_MARKER_ROLES);
    return { role, charObj: generateChar(role, null, regionEthnicity(m.lat, m.lng)) };
  }), [markers]);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  useFrame((_, delta) => { if (groupRef.current) groupRef.current.rotation.y += delta * 0.12; });
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial map={earthTexture} bumpMap={bumpTexture} bumpScale={0.04} roughness={0.7} metalness={0}/>
      </mesh>
      {markers.map((m, i) => <GlobeMarkerPoint key={i} lat={m.lat} lng={m.lng} radius={radius} color={markerColor}/>)}
      {markers.map((m, i) => (
        <GlobeCharacterMarker
          key={"char"+i}
          lat={m.lat} lng={m.lng} radius={radius}
          charObj={markerChars[i].charObj} role={markerChars[i].role}
          hovered={hoveredMarker === i}
          onHover={() => setHoveredMarker(i)}
          onLeave={() => setHoveredMarker(h => h === i ? null : h)}
          onTap={() => setHoveredMarker(h => h === i ? null : i)}
        />
      ))}
    </group>
  );
}

const GLOBE_SPIN_THRESHOLD = 2.2; // radians of accumulated user-driven rotation required before counting as "spun"

function GlobeScene({ radius, dots, markerColor, atmosphereColor, onSpun, onProgress }) {
  const { camera } = useThree();
  const firedRef = useRef(false);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const totalRef = useRef(0);
  const controlsRef = useRef(null);
  useEffect(() => { camera.position.set(0, 0, radius * 3.2); camera.lookAt(0, 0, 0); }, [camera, radius]);
  return (
    <>
      <ambientLight intensity={0.6}/>
      <directionalLight position={[radius*5, radius*2, radius*5]} intensity={1.4} color="#ffffff"/>
      <directionalLight position={[-radius*3, radius, -radius*2]} intensity={0.4} color="#C8A870"/>
      <RotatingGlobe radius={radius} dots={dots} markerColor={markerColor}/>
      <GlobeAtmosphere radius={radius} color={atmosphereColor} intensity={0.5}/>
      <OrbitControls ref={controlsRef} makeDefault enablePan={false} enableZoom={false} minDistance={5} maxDistance={15}
        rotateSpeed={0.4} autoRotate autoRotateSpeed={0.3} enableDamping dampingFactor={0.1}
        onStart={() => {
          draggingRef.current = true;
          lastAngleRef.current = controlsRef.current ? controlsRef.current.getAzimuthalAngle() : 0;
        }}
        onChange={() => {
          if (!draggingRef.current || firedRef.current || !controlsRef.current) return;
          const angle = controlsRef.current.getAzimuthalAngle();
          totalRef.current += Math.abs(angle - lastAngleRef.current);
          lastAngleRef.current = angle;
          const progress = Math.min(1, totalRef.current / GLOBE_SPIN_THRESHOLD);
          onProgress && onProgress(progress);
          if (totalRef.current > GLOBE_SPIN_THRESHOLD) {
            firedRef.current = true;
            onSpun && onSpun();
          }
        }}
        onEnd={() => { draggingRef.current = false; }}/>
    </>
  );
}

function Globe3D({ dots = [], radius = 2, markerColor = "#C8A870", atmosphereColor = "#C8A870", onSpun, onProgress }) {
  return (
    <div style={{ position:"relative", height:"420px", width:"100%" }}>
      <Canvas gl={{ antialias:true, alpha:true, powerPreference:"high-performance" }} dpr={[1,2]}
        camera={{ fov:45, near:0.1, far:1000, position:[0,0,radius*3.2] }} style={{ background:"transparent" }}>
        <Suspense fallback={null}>
          <GlobeScene radius={radius} dots={dots} markerColor={markerColor} atmosphereColor={atmosphereColor} onSpun={onSpun} onProgress={onProgress}/>
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── TextFlippingBoard (adapted from a Tailwind/clsx split-flap board —
// rewritten with inline styles only, no Tailwind/clsx/tailwind-merge,
// since this project has neither). "motion" is already a dependency. ──────
const FLAP_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:'\"%,./?°";
const FLAP_BOARD_ROWS = 4;
const FLAP_BOARD_COLS = 22;
const FLAP_BASE_COL_DELAY = 30;
const FLAP_BASE_ROW_DELAY = 20;
const FLAP_BASE_STEP_MS = 55;
const FLAP_BASE_FLIP_S = 0.35;
const FLAP_BASE_TOTAL_S = ((FLAP_BOARD_COLS - 1) * FLAP_BASE_COL_DELAY + (FLAP_BOARD_ROWS - 1) * FLAP_BASE_ROW_DELAY + 8 * FLAP_BASE_STEP_MS) / 1000;

const FlapCell = ({ target, delay, stepMs, flipDuration }) => {
  const [current, setCurrent] = useState(" ");
  const [prev, setPrev] = useState(" ");
  const [flipId, setFlipId] = useState(0);
  const curRef = useRef(" ");
  const tgtRef = useRef(null);
  const startTimer = useRef(null);
  const stepTimer = useRef(null);

  useEffect(() => {
    if (startTimer.current) clearTimeout(startTimer.current);
    if (stepTimer.current) clearTimeout(stepTimer.current);
    const normalized = FLAP_CHARS.includes(target.toUpperCase()) ? target.toUpperCase() : " ";
    if (normalized === tgtRef.current) return;
    tgtRef.current = normalized;
    if (normalized === " " && curRef.current === " ") return;
    const scrambleCount = normalized === " " ? 6 + Math.floor(Math.random()*6) : 16 + Math.floor(Math.random()*10);
    const runStep = (i) => {
      const isLast = i === scrambleCount;
      const ch = isLast ? normalized : FLAP_CHARS[1 + Math.floor(Math.random() * (FLAP_CHARS.length - 1))];
      setPrev(curRef.current);
      curRef.current = ch;
      setCurrent(ch);
      setFlipId(n => n + 1);
      if (!isLast) stepTimer.current = setTimeout(() => runStep(i + 1), stepMs);
    };
    startTimer.current = setTimeout(() => runStep(1), delay);
    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (stepTimer.current) clearTimeout(stepTimer.current);
    };
  }, [target, delay, stepMs]);

  const show = current === " " ? " " : current;
  const showPrev = prev === " " ? " " : prev;
  const cellTextStyle = { fontSize:"clamp(7px, 1.8vw, 16px)", lineHeight:1, fontFamily:"'Manrope',monospace", fontWeight:700, letterSpacing:"0.03em" };
  const halfBase = { position:"absolute", insetInline:0, overflow:"hidden", background:"#181410", color:"#E9E5DC" };
  const textWrap = { position:"absolute", insetInline:0, display:"flex", alignItems:"center", justifyContent:"center", userSelect:"none", ...cellTextStyle };
  const bottomDelay = flipDuration * 0.5;

  return (
    <div style={{ display:"flex", flexDirection:"column", aspectRatio:"3/5", borderRadius:"3px", border:"1px solid #2A2520", overflow:"hidden", background:"#0E0D0B" }}>
      <div style={{ position:"relative", flex:1, perspective:"300px", transformStyle:"preserve-3d" }}>
        <div style={{ ...halfBase, top:0, height:"calc(50% - 0.5px)", borderRadius:"2px 2px 0 0" }}>
          <div style={{ ...textWrap, top:0, height:"200%" }}>{show}</div>
        </div>
        <div style={{ ...halfBase, bottom:0, height:"calc(50% - 0.5px)", borderRadius:"0 0 2px 2px" }}>
          <div style={{ ...textWrap, bottom:0, height:"200%" }}>{show}</div>
        </div>
        {flipId > 0 && (
          <motion.div
            key={flipId}
            style={{ position:"absolute", insetInline:0, top:0, zIndex:10, height:"calc(50% - 0.5px)", transformOrigin:"bottom", overflow:"hidden", backfaceVisibility:"hidden", background:"#181410", color:"#E9E5DC", borderRadius:"2px 2px 0 0" }}
            initial={{ rotateX:0 }}
            animate={{ rotateX:-100 }}
            transition={{ duration: flipDuration, ease:[0.55,0.055,0.675,0.19] }}
          >
            <div style={{ ...textWrap, top:0, height:"200%" }}>{showPrev}</div>
          </motion.div>
        )}
        {flipId > 0 && (
          <motion.div
            key={"b"+flipId}
            style={{ position:"absolute", insetInline:0, bottom:0, zIndex:10, height:"calc(50% - 0.5px)", transformOrigin:"top", overflow:"hidden", backfaceVisibility:"hidden", background:"#181410", color:"#E9E5DC", borderRadius:"0 0 2px 2px" }}
            initial={{ rotateX:90 }}
            animate={{ rotateX:0 }}
            transition={{ duration: flipDuration*0.85, delay: bottomDelay, ease:[0.33,1.55,0.64,1] }}
          >
            <div style={{ ...textWrap, bottom:0, height:"200%" }}>{show}</div>
          </motion.div>
        )}
        <div style={{ position:"absolute", insetInline:0, top:"50%", height:"1px", transform:"translateY(-0.5px)", background:"rgba(0,0,0,0.5)", zIndex:20 }}/>
      </div>
    </div>
  );
};

function wrapParagraph(paragraph, maxCols) {
  const lines = [];
  const words = paragraph.split(/[ \t]+/).filter(Boolean);
  let currentLine = "";
  for (const word of words) {
    if (word.length > maxCols) {
      if (currentLine) { lines.push(currentLine); currentLine = ""; }
      lines.push(word.slice(0, maxCols));
      continue;
    }
    if (!currentLine) currentLine = word;
    else if (currentLine.length + 1 + word.length <= maxCols) currentLine += " " + word;
    else { lines.push(currentLine); currentLine = word; }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
function wrapText(input, maxCols) {
  return input.split("\n").flatMap(paragraph => paragraph.trim() === "" ? [""] : wrapParagraph(paragraph, maxCols));
}

function TextFlippingBoard({ text, className, style, duration = FLAP_BASE_TOTAL_S }) {
  const scale = duration / FLAP_BASE_TOTAL_S;
  const colDelay = FLAP_BASE_COL_DELAY * scale;
  const rowDelay = FLAP_BASE_ROW_DELAY * scale;
  const stepMs = FLAP_BASE_STEP_MS * scale;
  const flipDur = Math.min(0.6, Math.max(0.15, FLAP_BASE_FLIP_S * scale));

  const board = useMemo(() => {
    const grid = Array.from({ length: FLAP_BOARD_ROWS }, () => Array.from({ length: FLAP_BOARD_COLS }, () => " "));
    if (text) {
      const lines = wrapText(text, FLAP_BOARD_COLS).slice(0, FLAP_BOARD_ROWS);
      const startRow = Math.max(0, Math.floor((FLAP_BOARD_ROWS - lines.length) / 2));
      lines.forEach((line, i) => {
        const row = startRow + i;
        if (row >= FLAP_BOARD_ROWS) return;
        const startCol = Math.max(0, Math.floor((FLAP_BOARD_COLS - line.length) / 2));
        line.split("").forEach((ch, c) => { if (startCol + c < FLAP_BOARD_COLS) grid[row][startCol + c] = ch; });
      });
    }
    return grid;
  }, [text]);

  return (
    <div className={className} style={{ position:"relative", width:"100%", maxWidth:"640px", margin:"0 auto", borderRadius:"10px", background:"#141210", padding:"10px", boxShadow:"0 16px 50px -12px rgba(0,0,0,0.55)", ...style }}>
      <div style={{ display:"grid", gap:"2px", gridTemplateColumns:`repeat(${FLAP_BOARD_COLS}, 1fr)` }}>
        {board.map((row, r) => row.map((ch, c) => (
          <FlapCell key={`${r}-${c}`} target={ch} delay={c*colDelay + r*rowDelay} stepMs={stepMs} flipDuration={flipDur}/>
        )))}
      </div>
    </div>
  );
}

// ─── Spotlight (adapted from Aceternity UI — Tailwind classes/cn dropped
// for inline styles; the CSS keyframe driving the reveal lives in the
// global `css` template string as `@keyframes spotlight`). ────────────────
function Spotlight({ style, fill }) {
  return (
    <svg
      style={{ position:"absolute", zIndex:1, pointerEvents:"none", height:"169%", width:"138%", opacity:0, animation:"spotlight 2s ease .75s 1 forwards", ...style }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none">
      <g filter="url(#spotlightBlurFilter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill || "white"}
          fillOpacity="0.21"/>
      </g>
      <defs>
        <filter
          id="spotlightBlurFilter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8"/>
        </filter>
      </defs>
    </svg>
  );
}

// ─── ScrollRevealSection (adapted from Aceternity UI's ContainerScroll —
// Tailwind classes/cn dropped for inline styles; tilts/settles/scales a
// section in as it scrolls through the viewport). ──────────────────────────
function ScrollRevealSection({ children, style, isMobile }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [14, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [isMobile ? 0.92 : 0.95, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [50, 0]);
  return (
    <div ref={ref} style={{ perspective: "1200px", ...style }}>
      <motion.div style={{ rotateX: rotate, scale, y: translateY, transformStyle: "preserve-3d" }}>
        {children}
      </motion.div>
    </div>
  );
}

// ─── DottedGlowBackground (adapted from Aceternity UI — fixed dark theme,
// no CSS-variable theme lookup since this app has no light/dark toggle). ──
function DottedGlowBackground({ gap = 12, radius = 2, color = "rgba(232,225,212,0.15)", glowColor = "rgba(200,168,112,0.35)", opacity = 0.18, speedMin = 0.4, speedMax = 1.3 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  useEffect(() => {
    const el = canvasRef.current, container = containerRef.current;
    if (!el || !container) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let raf = 0, stopped = false, isVisible = true;
    const dpr = Math.min(Math.max(1, window.devicePixelRatio || 1), 2);
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      el.width = Math.max(1, Math.floor(width * dpr));
      el.height = Math.max(1, Math.floor(height * dpr));
      el.style.width = `${Math.floor(width)}px`;
      el.style.height = `${Math.floor(height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    let dots = [];
    const regenDots = () => {
      dots = [];
      const { width, height } = container.getBoundingClientRect();
      const cols = Math.ceil(width / gap) + 2, rows = Math.ceil(height / gap) + 2;
      const min = Math.min(speedMin, speedMax), max = Math.max(speedMin, speedMax), span = Math.max(max - min, 0);
      for (let i = -1; i < cols; i++) for (let j = -1; j < rows; j++) {
        dots.push({ x: i*gap + (j%2===0?0:gap*0.5), y: j*gap, phase: Math.random()*Math.PI*2, speed: min + Math.random()*span });
      }
    };
    regenDots();
    let last = performance.now();
    const draw = (now) => {
      if (stopped) return;
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      last = now;
      const { width, height } = container.getBoundingClientRect();
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.save();
      ctx.fillStyle = color;
      const time = now / 1000;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const mod = (time * d.speed + d.phase) % 2;
        const lin = mod < 1 ? mod : 2 - mod;
        const a = 0.25 + 0.55 * lin;
        if (a > 0.6) { ctx.shadowColor = glowColor; ctx.shadowBlur = 6 * ((a-0.6)/0.4); }
        else { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; }
        ctx.globalAlpha = a * opacity;
        ctx.beginPath();
        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    const handleResize = () => { resize(); regenDots(); };
    const observer = new IntersectionObserver((entries) => { isVisible = entries[0]?.isIntersecting ?? true; }, { threshold: 0.1 });
    observer.observe(container);
    window.addEventListener("resize", handleResize);
    raf = requestAnimationFrame(draw);
    return () => { stopped = true; cancelAnimationFrame(raf); window.removeEventListener("resize", handleResize); observer.disconnect(); ro.disconnect(); };
  }, [gap, radius, color, glowColor, opacity, speedMin, speedMax]);
  return (
    <div ref={containerRef} style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0 }}>
      <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:"100%" }}/>
    </div>
  );
}

const WORLD_MAP_DOTS = [
  { start:{ lat:40.7128, lng:-74.0060 }, end:{ lat:51.5074, lng:-0.1278 } },
  { start:{ lat:51.5074, lng:-0.1278 }, end:{ lat:-6.2088, lng:106.8456 } },
  { start:{ lat:-6.2088, lng:106.8456 }, end:{ lat:35.6762, lng:139.6503 } },
  { start:{ lat:35.6762, lng:139.6503 }, end:{ lat:-33.8688, lng:151.2093 } },
  { start:{ lat:-33.8688, lng:151.2093 }, end:{ lat:1.3521, lng:103.8198 } },
  { start:{ lat:1.3521, lng:103.8198 }, end:{ lat:25.2048, lng:55.2708 } },
  { start:{ lat:25.2048, lng:55.2708 }, end:{ lat:-23.5505, lng:-46.6333 } },
  { start:{ lat:-23.5505, lng:-46.6333 }, end:{ lat:40.7128, lng:-74.0060 } },
];

// ─── SquigglyText (adapted from Aceternity UI — no Tailwind, so the
// "inline-block" wrapper class becomes an inline style and `cn` is dropped). ──
function SquigglyText({ children, steps = 5, stepDuration = 80, scale = [6, 8], baseFrequency = 0.02, numOctaves = 3, as = "span", style }) {
  const reactId = useId();
  const safeId = reactId.replace(/[:_]/g, "");
  const filterId = (i) => `squiggly-${safeId}-${i}`;
  const filters = useMemo(() => Array.from({ length: steps }, (_, i) => `url(#${filterId(i)})`), [steps, safeId]);
  const time = useTime();
  const filter = useTransform(time, (t) => filters[Math.floor(t / stepDuration) % filters.length]);
  const scaleAt = (i) => Array.isArray(scale) ? scale[i % scale.length] : scale;
  const Wrapper = as === "div" ? motion.div : motion.span;
  return (
    <Wrapper style={{ filter, display:"inline-block", ...style }}>
      <svg aria-hidden style={{ position:"absolute", width:0, height:0, overflow:"hidden", pointerEvents:"none" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          {Array.from({ length: steps }).map((_, i) => (
            <filter id={filterId(i)} key={i}>
              <feTurbulence baseFrequency={baseFrequency} numOctaves={numOctaves} result="noise" seed={i} />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={scaleAt(i)} />
            </filter>
          ))}
        </defs>
      </svg>
      {children}
    </Wrapper>
  );
}

// ─── MagneticBox (adapted from the "MagneticButton" pattern — no Tailwind/
// clsx/tailwind-merge here, so the border/background hover ring is dropped
// and only the spring-driven pointer attraction is kept). Forwards its own
// onMouseMove/Leave/TouchMove/End so it can be nested inside elements that
// already bind their own pointer handlers (e.g. the tilt + "uncomfortable"
// mood logic on session/panel characters) without overriding them — both
// fire independently as the event bubbles.
function MagneticBox({ children, strength = 0.3, maxDistance = 28, style, innerStyle }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const updateFromPoint = (clientX, clientY) => {
    if (!ref.current) return;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    let x = (clientX - (left + width / 2)) * strength;
    let y = (clientY - (top + height / 2)) * strength;
    const distance = Math.hypot(x, y);
    if (distance > maxDistance) { const scale = maxDistance / distance; x *= scale; y *= scale; }
    setPos({ x, y });
  };
  return (
    <div ref={ref} style={style}
      onMouseMove={e => updateFromPoint(e.clientX, e.clientY)}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      onTouchMove={e => { const t = e.touches && e.touches[0]; if (t) updateFromPoint(t.clientX, t.clientY); }}
      onTouchEnd={() => setPos({ x: 0, y: 0 })}>
      <motion.div animate={{ x: pos.x, y: pos.y }} transition={{ type: "spring", stiffness: 150, damping: 25, mass: 0.1 }}
        style={{ width: "100%", height: "100%", ...innerStyle }}>
        {children}
      </motion.div>
    </div>
  );
}

export default function Profess() {
  const [screen, setScreen] = useState("welcome"); // welcome | intro | landing | lang | mode | disclaimer | intensity | scenario | session | summary
  const [welcomeStep, setWelcomeStep] = useState("ask"); // ask | tutorial | back
  const [tutorialIdx, setTutorialIdx] = useState(0);
  const introJustFinished = useRef(false);
  const landingScrollRef = useRef(null);
  const globeSectionRef = useRef(null);
  const [spinProgress, setSpinProgress] = useState(0);
  const [introPhase, setIntroPhase] = useState("spinning"); // spinning | black | fadein | done
  const handleGlobeSpun = () => {
    setIntroPhase("black");
    setTimeout(() => {
      introJustFinished.current = true;
      setScreen("landing");
      setTimeout(() => setIntroPhase("fadein"), 30);
      setTimeout(() => setIntroPhase("done"), 700);
    }, 1000);
  };
  const introOverlay = (introPhase === "black" || introPhase === "fadein") && (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:9999, pointerEvents: introPhase==="black"?"auto":"none", opacity: introPhase==="black"?1:0, transition:"opacity .6s ease" }}/>
  );
  useEffect(() => {
    if (screen !== "landing" || !introJustFinished.current) return;
    introJustFinished.current = false;
    const globeEl = globeSectionRef.current;
    if (!globeEl) return;
    globeEl.scrollIntoView({ behavior:"auto", block:"start" });
    const t1 = setTimeout(() => { window.scrollTo({ top:0, behavior:"smooth" }); }, 1000);
    let pollId = null;
    const t2 = setTimeout(() => {
      pollId = setInterval(() => {
        if (window.scrollY <= 0) { clearInterval(pollId); return; }
        window.scrollTo(0, 0);
      }, 100);
      setTimeout(() => { if (pollId) clearInterval(pollId); window.scrollTo(0, 0); }, 1500);
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); if (pollId) clearInterval(pollId); };
  }, [screen]);
  const [lang, setLang] = useState(null);
  const [sessionMode, setSessionMode] = useState(null);
  const [pendingMode, setPendingMode] = useState(null);
  const [intensity, setIntensity] = useState(null);
  const [scenario, setScenario] = useState(null); // selected scenario or null for free
  const [summary, setSummary] = useState(null);
  const [lastExchange, setLastExchange] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null); // "about" | "terms" | null
  const [warmMode, setWarmMode] = useState(false);
  const [roomMood, setRoomMood] = useState("neutral");
  const [hoveredChar, setHoveredChar] = useState(null);
  // Top-of-hierarchy mood override: any character that is currently being
  // tilted by the cursor shows "uncomfortable" regardless of whatever mood
  // it would otherwise be showing (warm lamp, session mood, etc). Clearing
  // the flag on mouse-leave restores whatever mood was already driving it.
  const [agitated, setAgitated] = useState({});
  const bodyTiltMove = (key) => (e) => {
    setAgitated(a => a[key] ? a : { ...a, [key]: true });
    panelTiltMove(e);
  };
  const bodyTiltLeave = (key) => (e) => {
    setAgitated(a => { if (!a[key]) return a; const n = { ...a }; delete n[key]; return n; });
    panelTiltLeave(e);
  };
  const landingChars = useRef(null);
  if (!landingChars.current) {
    landingChars.current = {
      sofaLeft: generateChar("friend_male"),
      sofaRight: generateChar("friend_female"),
      beginPanel: CHARS.default,
      aboutPanel: (() => { const r = pick(["interviewer","journalist","colleague","friend_female"]); return { char: generateChar(r), role: r }; })(),
      termsPanel: generateChar("judge"),
      heroRow: [
        generateChar("interviewer"),
        generateChar("colleague"),
        generateChar("crush"),
        generateChar("negotiator"),
      ],
    };
  }
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  // Gyroscope-driven tilt for mobile — mirrors the reference TiltBox pattern:
  // phone tilt (gamma/beta), not finger-drag, drives the same rotateY/rotateX
  // transform the desktop hover handlers use, since touchmove never fires on a tap.
  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;
    let raf = null;
    const onOrient = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const gamma = Math.max(-24, Math.min(24, e.gamma || 0));
        const beta = Math.max(-24, Math.min(24, (e.beta || 0) - 35));
        document.querySelectorAll('[data-gyro-tilt="1"]').forEach(el => {
          el.style.transform = `rotateY(${gamma / 1.6}deg) rotateX(${-beta / 1.6}deg)`;
        });
      });
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => { window.removeEventListener("deviceorientation", onOrient); if (raf) cancelAnimationFrame(raf); };
  }, [isMobile]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentRole, setCurrentRole] = useState("default");
  const [currentMood, setCurrentMood] = useState("neutral");
  const [isInRole, setIsInRole] = useState(false);
  const [charCache, setCharCache] = useState({}); // cache generated chars per role per session
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTalking, setIsTalking] = useState(false); // mouth animation
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(0);
  const [showMusicSuggest, setShowMusicSuggest] = useState(false);
  const [showDesktopMusicHint, setShowDesktopMusicHint] = useState(false);
  const [radioNotePos, setRadioNotePos] = useState({ top:0, left:0 });
  const radioMobileRef = useRef(null);
  const mobileMusicConfirmed = useRef(false);
  const hasOpenedMusic = useRef(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const speechRef = useRef(null);
  const recognitionRef = useRef(null);
  const talkTimerRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (screen !== "session" || hasOpenedMusic.current) return;
    const showT = setTimeout(() => setShowMusicSuggest(true), 3000);
    const hideT = setTimeout(() => setShowMusicSuggest(false), 8000);
    return () => { clearTimeout(showT); clearTimeout(hideT); };
  }, [screen]);

  const extractRole = (t) => (t.match(/\[ROLE:(\w+)\]/) || [])[1] || null;
  const extractMood = (t) => (t.match(/\[MOOD:(\w+)\]/) || [])[1] || null;
  const extractMode = (t) => (t.match(/\[MODE:(\w+)\]/) || [])[1] || null;
  const extractInner = (t) => { const m = t.match(/\[INNER:(.*?)\]/); return m ? m[1].replace(/\*/g,"").trim() : null; };
  const extractChar = (t) => { const m = t.match(/\[CHAR:([^\]]+)\]/); return m ? m[1].trim() : null; };
  const extractTitle = (t) => { const m = t.match(/\[TITLE:([^\]]+)\]/); return m ? m[1].trim() : null; };
  const extractGender = (t) => { const m = t.match(/\[GENDER:(f|m)\]/); return m ? m[1] : null; };
  const cleanText = (t) => t
    .replace(/\[ROLE:\w+\]/g,"").replace(/\[MOOD:\w+\]/g,"")
    .replace(/\[MODE:\w+\]/g,"").replace(/\[INNER:.*?\]/g,"")
    .replace(/\[CHAR:[^\]]+\]/g,"").replace(/\[TITLE:[^\]]+\]/g,"")
    .replace(/\[GENDER:[^\]]+\]/g,"")
    .replace(/^---+$/gm, "").trim();

  const COACHING_RE = /^(COACHING|COACH|FEEDBACK|CATATAN|KOREKSI|ANALISIS|Giliran|Giliranmu|Sekarang giliran|Kamu yang|It's your turn|Your turn|Now it's)/i;

  const parseSegments = (text) => {
    const segments = [];
    const lines = text.split('\n');
    let inCoaching = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^---+$/.test(trimmed)) continue;
      if (COACHING_RE.test(trimmed)) {
        inCoaching = true;
        segments.push({ type: 'section_break' });
        continue;
      }
      const stageMatch = trimmed.match(/^\(\((.*?)\)\)$/);
      if (stageMatch) {
        inCoaching = false;
        segments.push({ type: 'stage', text: stageMatch[1].trim() });
      } else {
        const segType = inCoaching ? 'coaching' : 'dialog';
        const last = segments.length > 0 ? segments[segments.length-1] : null;
        if (last && last.type === segType) {
          last.text += ' ' + trimmed;
        } else {
          segments.push({ type: segType, text: trimmed });
        }
      }
    }
    return segments;
  };

  const scrubForSpeech = (text) => text
    .replace(/\[.*?\]/g, '')
    .replace(/\(\(.*?\)\)/g, '')
    .replace(/^---+$/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // Strip punctuation that TTS reads literally
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
    .replace(/ - /g, ', ')
    .replace(/\.\.\./g, '. ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Strip remaining symbols
    .replace(/[*_~`#|>]/g, '')
    .replace(/\[|\]/g, '')
    .replace(/\(|\)/g, '')
    // Clean whitespace
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 700);

  const cleanForSpeech = scrubForSpeech;

  const getVoiceProfile = useCallback((role, mood, inRole, isInnerThought = false) => {
    const voices = window.speechSynthesis?.getVoices() || [];
    const byName = (name) => voices.find(v => v.name === name);
    const isID = lang === "id";

    // For Indonesian sessions: use Google Bahasa Indonesia for all roles
    // Rate tuned slower because Indonesian TTS needs more time to sound natural
    if (isID) {
      const idVoice = byName("Google Bahasa Indonesia") ||
        voices.find(v => v.lang === "id-ID") ||
        byName("Google UK English Male") || // last resort fallback
        voices.find(v => v.lang?.startsWith("en"));

      let rate = 1.05, pitch = 1.0, volume = 0.92;

      // Indonesian voice sounds clearer at slightly slower rate than English
      if (!inRole) { rate = 1.0; pitch = 1.0; }
      else {
        switch(role) {
          case "interviewer":   rate = 0.98; pitch = 1.02; break;
          case "journalist":    rate = 1.06; pitch = 1.04; break;
          case "judge":         rate = 0.92; pitch = 0.96; break;
          case "examiner":      rate = 0.94; pitch = 0.97; break;
          case "lawyer":        rate = 0.96; pitch = 0.98; break;
          case "opponent":      rate = 1.08; pitch = 1.0;  break;
          case "parent":        rate = 0.94; pitch = 0.97; break;
          case "friend_female": rate = 1.10; pitch = 1.06; break;
          case "friend_male":   rate = 1.08; pitch = 1.0;  break;
          case "colleague":     rate = 1.04; pitch = 1.0;  break;
          case "stranger":      rate = 1.02; pitch = 0.99; break;
          default:              rate = 1.0;  pitch = 1.0;
        }
      }

      if (isInnerThought) { rate = Math.max(0.80, rate - 0.12); volume = Math.max(0.38, volume - 0.34); pitch = Math.min(1.50, pitch + 0.15); }

      const moodMod = { surprised:{rate:.06,pitch:.10}, amused:{rate:.04,pitch:.08}, thinking:{rate:-.05,pitch:-.03}, warm:{rate:-.02,pitch:.03}, skeptical:{rate:-.03,pitch:-.05}, serious:{rate:-.04,pitch:-.08}, uncomfortable:{rate:-.02,pitch:.02}, neutral:{rate:0,pitch:0} }[mood] || {rate:0,pitch:0};

      return {
        voice: idVoice,
        rate:   Math.max(0.78, Math.min(1.3, rate  + moodMod.rate)),
        pitch:  Math.max(0.7,  Math.min(1.3, pitch + moodMod.pitch)),
        volume: Math.max(0.4,  Math.min(1.0, volume)),
      };
    }

    // ── English voice assignment ───────────────────────────────────────────
    let voice = null;
    if (!inRole) {
      // Coach: Microsoft David at low pitch sounds older and more authoritative
      voice = byName("Microsoft David - English (United States)") || byName("Google UK English Male");
    } else {
      switch(role) {
        case "interviewer":
        case "journalist":
          voice = byName("Google UK English Female"); break;
        case "judge":
        case "examiner":
        case "lawyer":
        case "opponent":
        // Formal authoritative/adversarial — deep, deliberate
        case "judge": case "examiner": case "prosecutor": case "cross_examiner":
        case "dean": case "regulator": case "official": case "commissioner":
        case "board_member": case "auditor": case "parent": case "grandparent":
        case "professor_academic": case "mentor": case "senior": case "calon_mertua":
        case "dosen_pembimbing": case "pak_rt":
          voice = byName("Microsoft David - English (United States)"); break;
        // Formal female — professional UK
        case "interviewer": case "journalist": case "critic": case "investigator":
        case "reviewer": case "panelist": case "manager": case "defense_lawyer":
          voice = byName("Google UK English Female"); break;
        // Casual female — warm US
        case "friend_female": case "best_friend": case "crush": case "romantic_interest":
        case "date": case "blind_date": case "sibling": case "ex_partner":
          voice = byName("Google US English"); break;
        // Casual male — relaxed Mark
        case "friend_male": case "colleague": case "stranger": case "new_acquaintance":
        case "neighbor": case "classmate": case "alumni": case "subordinate":
        case "mentee": case "junior": case "teman_ospek": case "anggota_tim_debat":
        case "senior_organisasi": case "host": case "guest": case "fellow_passenger":
        case "customer_service":
          voice = byName("Microsoft Mark - English (United States)"); break;
        // Formal composed — UK Male
        case "negotiator": case "client": case "customer": case "ceo": case "executive":
        case "diplomat": case "investor": case "acquirer": case "partner": case "vendor":
        case "contractor": case "shareholder": case "voter": case "consumer":
        case "media_audience": case "opponent":
          voice = byName("Google UK English Male"); break;
        default:
          voice = byName("Google UK English Male");
      }
    }
    if (!voice) voice = byName("Google UK English Male") || byName("Google US English") || voices.find(v=>v.lang?.startsWith("en"));

    let rate = 1.0, pitch = 1.0, volume = 0.92;

    if (!inRole) {
      rate = 1.05; pitch = 0.82; volume = 0.92; // Coach: lower pitch = older, wiser
    } else {
      switch(role) {
        // Evaluators
        case "interviewer": case "reviewer": case "panelist":
          rate = 1.02; pitch = 0.98; volume = 0.90; break;
        case "journalist": case "critic":
          rate = 1.12; pitch = 1.05; volume = 0.93; break;
        case "judge": case "cross_examiner":
          rate = 0.96; pitch = 0.80; volume = 0.95; break; // very deep
        case "examiner": case "dean": case "professor_academic": case "dosen_pembimbing":
          rate = 0.98; pitch = 0.84; volume = 0.93; break;
        case "auditor": case "regulator": case "commissioner": case "investigator":
          rate = 0.96; pitch = 0.86; volume = 0.94; break;
        case "board_member": case "shareholder":
          rate = 0.98; pitch = 0.88; volume = 0.95; break;
        // Adversarial
        case "opponent": case "prosecutor":
          rate = 1.15; pitch = 0.92; volume = 0.95; break;
        case "defense_lawyer":
          rate = 1.00; pitch = 0.88; volume = 0.94; break;
        // Authoritative
        case "ceo": case "executive": case "diplomat": case "official":
          rate = 0.98; pitch = 0.88; volume = 0.95; break;
        case "investor": case "acquirer":
          rate = 1.00; pitch = 0.90; volume = 0.93; break;
        // Negotiation/service
        case "negotiator": case "partner":
          rate = 1.02; pitch = 0.90; volume = 0.93; break;
        case "client": case "customer": case "consumer":
          rate = 1.06; pitch = 0.94; volume = 0.91; break;
        case "vendor": case "contractor":
          rate = 1.05; pitch = 0.96; volume = 0.90; break;
        case "customer_service":
          rate = 1.08; pitch = 1.04; volume = 0.90; break;
        // Audience
        case "voter": case "media_audience":
          rate = 1.05; pitch = 0.96; volume = 0.90; break;
        // Relasi dekat — older
        case "parent": case "grandparent": case "calon_mertua":
          rate = 0.98; pitch = 0.84; volume = 0.92; break;
        case "mentor": case "senior": case "pak_rt":
          rate = 0.98; pitch = 0.88; volume = 0.92; break;
        // Relasi dekat — young/casual
        case "sibling": case "friend_male": case "best_friend":
          rate = 1.14; pitch = 0.98; volume = 0.90; break;
        case "friend_female": case "crush": case "romantic_interest":
        case "date": case "blind_date": case "ex_partner":
          rate = 1.18; pitch = 1.10; volume = 0.90; break;
        // Profesional casual
        case "colleague": case "manager":
          rate = 1.10; pitch = 0.96; volume = 0.90; break;
        case "subordinate": case "mentee": case "junior":
          rate = 1.10; pitch = 1.02; volume = 0.88; break;
        // Stranger/acquaintance
        case "stranger": case "fellow_passenger":
          rate = 1.08; pitch = 0.94; volume = 0.88; break;
        case "new_acquaintance": case "neighbor": case "classmate": case "alumni":
        case "host": case "guest":
          rate = 1.10; pitch = 0.98; volume = 0.90; break;
        // Indonesia kontekstual
        case "senior_organisasi":
          rate = 1.0; pitch = 0.92; volume = 0.92; break;
        case "teman_ospek": case "anggota_tim_debat":
          rate = 1.12; pitch = 1.02; volume = 0.90; break;
        default:
          rate = 1.05; pitch = 0.96; volume = 0.92;
      }
    }

    // Inner thought — Opsi C: pitch naik, volume turun, rate melambat
    // Terasa seperti "suara dalam kepala" — masih suara karakter tapi ethereal
    if (isInnerThought) {
      rate   = Math.max(0.80, rate   - 0.12);
      volume = Math.max(0.38, volume - 0.34);
      pitch  = Math.min(1.50, pitch  + 0.15);
    }

    // Mood modulation
    const moodMod = {
      neutral:       { rate: 0,     pitch: 0,     vol: 0     },
      surprised:     { rate: +0.07, pitch: +0.14, vol: +0.03 },
      amused:        { rate: +0.05, pitch: +0.10, vol: +0.02 },
      thinking:      { rate: -0.06, pitch: -0.04, vol: -0.02 },
      warm:          { rate: -0.03, pitch: +0.04, vol: -0.01 },
      skeptical:     { rate: -0.04, pitch: -0.06, vol: 0     },
      serious:       { rate: -0.05, pitch: -0.10, vol: +0.02 },
      uncomfortable: { rate: -0.03, pitch: +0.03, vol: -0.02 },
    }[mood] || { rate: 0, pitch: 0, vol: 0 };

    return {
      voice,
      rate:   Math.max(0.78, Math.min(1.4,  rate  + moodMod.rate)),
      pitch:  Math.max(0.7,  Math.min(1.4,  pitch + moodMod.pitch)),
      volume: Math.max(0.4,  Math.min(1.0,  volume + moodMod.vol)),
    };
  }, []);

  const speakSegments = useCallback((segments, role, mood, inRole) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const queue = segments.filter(s => s.text.trim());
    if (!queue.length) return;

    let idx = 0;
    const playNext = () => {
      if (idx >= queue.length) { setIsSpeaking(false); stopTalking(); return; }
      const seg = queue[idx++];
      const isStage = seg.type === 'stage';
      const isInner = seg.type === 'inner';
      const cleanedText = scrubForSpeech(seg.text);
      if (!cleanedText) { playNext(); return; }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      // Stage: coach narrator voice
      // Inner: same voice as character but with isInnerThought modulation
      // Dialog: normal character voice
      const profile = isStage
        ? (() => {
            const coachVoice = voices.find(v => v.name === 'Google UK English Male') ||
              voices.find(v => v.lang?.startsWith('en'));
            return { voice: coachVoice, rate: 0.92, pitch: 0.96, volume: 0.62 };
          })()
        : getVoiceProfile(role, mood, inRole, isInner);

      if (profile.voice) utterance.voice = profile.voice;
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = profile.volume;

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (!isStage && !isInner) startTalking(); else stopTalking();
      };
      utterance.onend = () => { playNext(); };
      utterance.onerror = () => { playNext(); };
      utterance.onboundary = () => {
        if (!isStage && !isInner) { setIsTalking(true); setTimeout(() => setIsTalking(false), 160); }
      };

      window.speechSynthesis.speak(utterance);
    };

    const startQueue = () => { setIsSpeaking(true); playNext(); };
    if (voices.length > 0) startQueue();
    else window.speechSynthesis.onvoiceschanged = startQueue;
  }, [speechEnabled, getVoiceProfile]);

  const speak = useCallback((text, role, mood, inRole, innerThought = null) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const segments = parseSegments(text);
    if (!segments.length && !innerThought) return;
    // Add inner thought as final segment with special marker
    const allSegments = innerThought
      ? [...segments, { type: 'inner', text: innerThought }]
      : segments;
    speakSegments(allSegments, role, mood, inRole);
  }, [speechEnabled, speakSegments]);

  // Render markdown in text: bold, italic — returns array of spans
  const renderMarkdown = (text) => {
    if (!text) return null;
    const parts = [];
    let remaining = text;
    let key = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*/s);
      const italicMatch = remaining.match(/^(.*?)\*(.*?)\*/s);
      if (boldMatch && (!italicMatch || boldMatch[0].length <= italicMatch[0].length)) {
        if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
        parts.push(<strong key={key++} style={{ fontWeight:500, color:"inherit" }}>{boldMatch[2]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
      } else if (italicMatch) {
        if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
        parts.push(<em key={key++} style={{ fontStyle:"italic", color:"inherit" }}>{italicMatch[2]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }
    return parts;
  };

  const startTalking = () => {
    setIsTalking(true);
    if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
  };
  const stopTalking = () => {
    talkTimerRef.current = setTimeout(() => setIsTalking(false), 200);
  };

  const stopSpeech = () => { window.speechSynthesis?.cancel(); setIsSpeaking(false); setIsTalking(false); };

  const toggleMic = useCallback(() => {
    setMicError(null);
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError("Speech recognition requires Chrome or Edge."); return; }
    stopSpeech();
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = lang === "id" ? "id-ID" : "en-US";
    let final = "";
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => { let interim=""; final=""; for(let i=0;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript;else interim+=e.results[i][0].transcript;} setInput((final+interim).trim()); };
    r.onerror = (e) => { setIsListening(false); if(e.error==="not-allowed")setMicError("Mic access denied."); else if(e.error!=="aborted")setMicError("Mic error: "+e.error); };
    r.onend = () => { setIsListening(false); if(final.trim()) setTimeout(()=>document.getElementById("psend")?.click(),300); };
    recognitionRef.current = r; r.start();
  }, [isListening, stopSpeech]);

  const changeRoleAndMood = (newRole, newMood, newMode, charName, charTitle, charGender) => {
    const newInRole = newMode === "dialog";
    const roleChanged = newRole && newRole !== currentRole;
    if (roleChanged) {
      if (newRole !== "default" && !charCache[newRole]) {
        const generated = generateChar(newRole, charGender || null);
        generated.title = charTitle || ROLE_TITLES[newRole] || newRole;
        if (charName) generated.name = charName;
        setCharCache(prev => ({ ...prev, [newRole]: generated }));
      } else if ((charName || charTitle || charGender) && charCache[newRole]) {
        setCharCache(prev => ({ ...prev, [newRole]: {
          ...prev[newRole],
          ...(charName ? { name: charName } : {}),
          ...(charTitle ? { title: charTitle } : {}),
          ...(charGender ? { gender: charGender, hairLong: charGender === "f" } : {}),
        }}));
      }
      setIsTransitioning(true);
      setTimeout(() => { setCurrentRole(newRole||currentRole); setCurrentMood(newMood||"neutral"); setIsInRole(newInRole); setIsTransitioning(false); }, 380);
    } else {
      if (newMood) setCurrentMood(newMood);
      setIsInRole(newInRole);
      if ((charName || charTitle || charGender) && currentRole !== "default") {
        setCharCache(prev => ({ ...prev, [currentRole]: {
          ...(prev[currentRole]||{}),
          ...(charName ? { name: charName } : {}),
          ...(charTitle ? { title: charTitle } : {}),
          ...(charGender ? { gender: charGender, hairLong: charGender === "f" } : {}),
        }}));
      }
    }
  };

  const callAPI = async (msgs, mode, language, intensityLevel) => {
    const rawPrompt = PROMPTS[language||"en"][mode] || PROMPTS.en.formal;
    const systemPrompt = rawPrompt.replace(/\{\{INTENSITY\}\}/g, intensityLevel || "challenging");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: systemPrompt,
        messages: msgs.map(m => ({ role: m.role==="assistant"?"assistant":"user", content: m.content }))
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "API error");
    return data.content?.find(b=>b.type==="text")?.text || "";
  };

  const startSession = async (mode, selectedScenario = null) => {
    setSessionMode(mode); setScreen("session"); setLoading(true); setError(null);
    try {
      const baseMsg = lang === "id" ? "Halo, saya ingin memulai sesi." : "Hello, I'd like to start a session.";
      const initMsg = selectedScenario
        ? (lang === "id" ? `${baseMsg} Skenario yang saya pilih: ${selectedScenario}` : `${baseMsg} My chosen scenario: ${selectedScenario}`)
        : baseMsg;
      const init = [{ role:"user", content:initMsg }];
      const text = await callAPI(init, mode, lang, intensity);
      const role = extractRole(text)||"default", mood = extractMood(text)||"neutral", modeTag = extractMode(text)||"coaching";
      const inner = extractInner(text);
      const charName = extractChar(text);
      const charTitle = extractTitle(text);
      const charGender = extractGender(text);
      changeRoleAndMood(role, mood, modeTag, charName, charTitle, charGender);
      const clean = cleanText(text);
      setMessages([{ role:"user", content:initMsg }, { role:"assistant", content:clean, inRole:modeTag==="dialog", inner }]);
      speak(clean, role, mood, modeTag==="dialog", inner);
    } catch(e) { setError("Connection failed. Please try again."); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput(""); if(textareaRef.current) textareaRef.current.style.height="48px";
    setError(null); stopSpeech();
    const newMsgs = [...messages, { role:"user", content:msg }]; setMessages(newMsgs); setLoading(true);
    // Store last user message for Try Again
    setLastExchange({ userMsg: msg, msgIndex: newMsgs.length - 1 });
    try {
      const text = await callAPI(newMsgs, sessionMode, lang, intensity);
      const role = extractRole(text)||currentRole, mood = extractMood(text)||"neutral", modeTag = extractMode(text)||"coaching";
      const inner = extractInner(text);
      const charName = extractChar(text);
      const charTitle = extractTitle(text);
      const charGender = extractGender(text);
      // Only switch to default if explicitly role:default — preserve current role during coaching
      const resolvedRole = (role === "default" && modeTag === "coaching" && currentRole !== "default")
        ? currentRole : role;
      changeRoleAndMood(resolvedRole, mood, modeTag, charName, charTitle, charGender);
      const clean = cleanText(text);
      const inRole = modeTag==="dialog";
      // Detect summary
      if (clean.includes("[SUMMARY_START]")) {
        const summaryMatch = clean.match(/\[SUMMARY_START\]([\s\S]*?)\[SUMMARY_END\]/);
        if (summaryMatch) {
          setSummary(summaryMatch[1].trim());
          const withoutSummary = clean.replace(/\[SUMMARY_START\][\s\S]*?\[SUMMARY_END\]/, "").trim();
          setMessages([...newMsgs, { role:"assistant", content:withoutSummary, inRole, inner }]);
          speak(withoutSummary, role, mood, inRole);
          setTimeout(() => setScreen("summary"), 1500);
          return;
        }
      }
      setMessages([...newMsgs, { role:"assistant", content:clean, inRole, inner }]);
      speak(clean, role, mood, inRole, inner);
    } catch(e) { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} };
  const handleTA = (e) => { setInput(e.target.value); e.target.style.height="48px"; e.target.style.height=Math.min(e.target.scrollHeight,160)+"px"; };
  const tryAgain = () => {
    if (!lastExchange) return;
    stopSpeech();
    // Remove messages from lastExchange onwards and re-set input
    const trimmed = messages.slice(0, lastExchange.msgIndex);
    setMessages(trimmed);
    setInput(lastExchange.userMsg);
    if (textareaRef.current) {
      textareaRef.current.value = lastExchange.userMsg;
      textareaRef.current.style.height = "48px";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  };

  const endSession = () => {
    // Trigger summary by sending end signal
    const endMsg = lang === "id" ? "Saya ingin mengakhiri sesi ini." : "I'd like to end this session.";
    setInput(endMsg);
    setTimeout(() => document.getElementById("psend")?.click(), 100);
  };

  // "Ask Coach" — interrupts the in-role roleplay and asks Profess to step
  // out as coach immediately, instead of waiting for a natural 2-4 turn
  // exchange. Relies on the existing system-prompt exception ("if the user
  // explicitly asks for feedback, coach immediately") rather than a new flow.
  const askCoach = () => {
    if (loading) return;
    const coachMsg = lang === "id"
      ? "(Tolong hentikan sebentar roleplay-nya — saya butuh masukan dari Profess sebagai pelatih sekarang.)"
      : "(Please pause the roleplay for a moment — I need feedback from Profess as my coach right now.)";
    setInput(coachMsg);
    setTimeout(() => document.getElementById("psend")?.click(), 50);
  };

  const resetSession = () => { stopSpeech(); recognitionRef.current?.stop(); setScreen("lang"); setLang(null); setSessionMode(null); setPendingMode(null); setIntensity(null); setScenario(null); setSummary(null); setLastExchange(null); setMessages([]); setInput(""); setError(null); setCurrentRole("default"); setCurrentMood("neutral"); setIsInRole(false); setIsTransitioning(false); setIsListening(false); setMicError(null); setCharCache({}); setShowMusicSuggest(false); hasOpenedMusic.current = false; };

  const displayRole = (isInRole || currentRole !== "default") ? currentRole : "default";
  const charMeta = displayRole === "default"
    ? { ...CHARS.default, title: lang === "id" ? "Coach Kamu" : "Your Coach" }
    : (charCache[displayRole] || generateChar(displayRole));
  if (displayRole !== "default" && !charMeta.title) charMeta.title = ROLE_TITLES[displayRole] || displayRole;
  const charSVG = buildSVG(charMeta, agitated.session ? "uncomfortable" : currentMood, isTalking && isSpeaking);



  // ─── SVG Icons ────────────────────────────────────────────────────────────
  const IconVolume = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
  const IconMute = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  );
  const IconLamp = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6l3 7H6l3-7Z"/>
      <line x1="12" y1="9" x2="12" y2="18"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
      <line x1="9" y1="18" x2="15" y2="18"/>
    </svg>
  );
  const IconMic = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  );
  const IconStop = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="1.5"/>
    </svg>
  );
  const IconSend = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
  const IconEnd = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
      <line x1="12" y1="2" x2="12" y2="12"/>
    </svg>
  );
  const IconCoach = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 22 12 12 22 2 12"/>
    </svg>
  );
  const IconArrowLeft = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  );
  const IconRefresh = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.61"/>
    </svg>
  );
  const IconMobile = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12" y2="18"/>
    </svg>
  );
  const IconDesktop = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );

  // Flowing 3D card tilt — same mechanism as the reference app's language/
  // reminder cards: rotate toward the cursor position, reset on leave.
  // Works on both mouse (desktop hover) and touch (mobile drag/press).
  const panelTiltMove = (e) => {
    const el = e.currentTarget;
    const point = e.touches ? e.touches[0] : e;
    if (!point) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const rx = (point.clientX - left - width / 2) / 18;
    const ry = (point.clientY - top - height / 2) / 18;
    el.style.transform = `rotateY(${rx}deg) rotateX(${-ry}deg)`;
  };
  const panelTiltLeave = (e) => { e.currentTarget.style.transform = "rotateY(0deg) rotateX(0deg)"; };

  // ─── Step indicator ───────────────────────────────────────────────────────
  const ONBOARDING_STEPS = ["lang","mode","disclaimer","intensity","scenario"];
  const stepIndex = ONBOARDING_STEPS.indexOf(screen);
  const StepDots = () => stepIndex >= 0 ? (
    <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
      {ONBOARDING_STEPS.map((s,i) => (
        <div key={s} style={{ width: i===stepIndex?"20px":"5px", height:"3px", borderRadius:"2px", background: i<stepIndex?"#C8A458":i===stepIndex?"#C8A870":"#1E1E1E", transition:"all .3s ease" }}/>
      ))}
    </div>
  ) : null;

  // ─── Wordmark (clickable → landing) ──────────────────────────────────────
  const Wordmark = ({ size="17px" }) => (
    <button onClick={() => setScreen("landing")} style={{ background:"none", border:"none", padding:0, cursor:"pointer" }}>
      <SquigglyText style={{ fontFamily:"'Playfair Display',serif", fontSize:size, fontWeight:500, letterSpacing:".06em", color:"#E9E5DC" }}>Profess</SquigglyText>
    </button>
  );

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Manrope:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    ::-webkit-scrollbar{width:2px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#1E1E1E;border-radius:1px;}

    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes charIn{from{opacity:0;transform:scale(.95) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes pulse{0%,100%{opacity:.15;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
    @keyframes waveBar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
    @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(196,122,138,.35)}70%{box-shadow:0 0 0 8px rgba(196,122,138,0)}}
    @keyframes scrollLine{0%{transform:translateY(-100%);opacity:0}30%{opacity:1}100%{transform:translateY(100%);opacity:0}}
    @keyframes grain{0%,100%{transform:translate(0,0)}10%{transform:translate(-1%,-1%)}20%{transform:translate(1%,0)}30%{transform:translate(0,1%)}40%{transform:translate(-1%,0)}50%{transform:translate(0,-1%)}60%{transform:translate(1%,1%)}70%{transform:translate(-1%,1%)}80%{transform:translate(1%,-1%)}90%{transform:translate(-1%,0)}}

    @keyframes idleBreathe{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-2px) scaleY(1.008)}}
    @keyframes coachNod{0%,80%,100%{transform:rotate(0deg)}85%{transform:rotate(3deg)}92%{transform:rotate(-1.5deg)}}
    @keyframes journalistSway{0%,100%{transform:rotate(0deg)}33%{transform:rotate(1.5deg)}66%{transform:rotate(-1deg)}}
    @keyframes judgeTap{0%,90%,100%{transform:translateY(0)}92%{transform:translateY(2px)}95%{transform:translateY(0)}}
    @keyframes friendBob{0%,100%{transform:translateY(0) rotate(0deg)}40%{transform:translateY(-3px) rotate(1deg)}70%{transform:translateY(-1px) rotate(-0.5deg)}}
    @keyframes negotiatorLean{0%,100%{transform:rotate(0deg) translateX(0)}50%{transform:rotate(-1deg) translateX(-1px)}}

    @keyframes moodSurprised{0%{transform:scale(1) translateY(0)}20%{transform:scale(1.04) translateY(-4px)}60%{transform:scale(1.02) translateY(-2px)}100%{transform:scale(1) translateY(0)}}
    @keyframes moodAmused{0%,100%{transform:rotate(0deg)}25%{transform:rotate(2deg)}75%{transform:rotate(-1.5deg)}}
    @keyframes moodSkeptical{0%,100%{transform:rotate(0deg) translateX(0)}50%{transform:rotate(-2deg) translateX(-2px)}}
    @keyframes moodSerious{0%,100%{transform:scaleY(1) translateY(0)}50%{transform:scaleY(1.01) translateY(-1px)}}
    @keyframes moodThinking{0%,100%{transform:rotate(0deg) translateX(0)}30%{transform:rotate(3deg) translateX(1px)}70%{transform:rotate(-1deg) translateX(0)}}
    @keyframes moodWarm{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
    @keyframes moodUncomf{0%,100%{transform:translateX(0)}20%{transform:translateX(-2px)}40%{transform:translateX(2px)}60%{transform:translateX(-1px)}80%{transform:translateX(1px)}}
    @keyframes auraBreath{0%,100%{transform:scale(1) rotate(0deg);opacity:var(--aura-base,0.6)}33%{transform:scale(1.08) rotate(2deg);opacity:calc(var(--aura-base,0.6) * 1.3)}66%{transform:scale(0.96) rotate(-1.5deg);opacity:calc(var(--aura-base,0.6) * 0.8)}}
    @keyframes auraRay{0%,100%{transform:scaleY(1) rotate(var(--ray-angle,0deg));opacity:0.4}50%{transform:scaleY(1.2) rotate(calc(var(--ray-angle,0deg) + 8deg));opacity:0.7}}
    @keyframes spotlight{0%{opacity:0;transform:translate(-72%,-62%) scale(0.5)}100%{opacity:1;transform:translate(-50%,-40%) scale(1)}}

    @keyframes talkBody{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
    @keyframes blink{0%,94%,100%{transform:scaleY(1)}96%,98%{transform:scaleY(0.08)}}
    @keyframes eyeDrift{0%,100%{transform:translateX(0)}30%{transform:translateX(1.5px)}60%{transform:translateX(-1px)}80%{transform:translateX(0.5px)}}
    @keyframes gesturePoint{0%,70%,100%{transform:translateY(0) rotate(0deg)}75%{transform:translateY(-8px) rotate(-12deg)}85%{transform:translateY(-6px) rotate(-8deg)}92%{transform:translateY(-2px) rotate(-3deg)}}
    @keyframes gestureOpen{0%,60%,100%{transform:rotate(0deg) translateX(0)}65%{transform:rotate(-18deg) translateX(-4px)}80%{transform:rotate(-10deg) translateX(-2px)}92%{transform:rotate(-4deg) translateX(-1px)}}
    @keyframes gestureNegotiate{0%,50%,100%{transform:rotate(0deg)}55%{transform:rotate(14deg) translateY(-3px)}70%{transform:rotate(8deg) translateY(-2px)}85%{transform:rotate(2deg)}}
    @keyframes browFlash{0%,85%,100%{transform:translateY(0)}88%{transform:translateY(-2px)}93%{transform:translateY(-1px)}}
    @keyframes screenFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes antennaP{0%,100%{opacity:.5}50%{opacity:1}}
    @keyframes musicFadeIn{from{opacity:0}to{opacity:1}}

    .msg-enter{animation:fadeUp .28s ease forwards}
    .char-enter{animation:charIn .38s ease forwards}
    .mic-active{animation:micPulse 1.2s ease infinite}
    .screen-enter{animation:screenFade .32s ease forwards}
    .grain-layer{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.03;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");background-size:200px 200px;animation:grain 8s steps(10) infinite;}

    button{cursor:pointer;}
    button:focus-visible{outline:1px solid #C8A870;outline-offset:2px;}

    @media (max-width:640px){
      .hero-section{height:auto !important;padding-bottom:40px !important;}
      .hero-living-room{display:none !important;}
      .hero-lamp-hint{display:none !important;}
      .hero-radio-hint{display:none !important;}
      .hero-lamp-overlay{display:none !important;}
      .hero-radio-overlay{display:none !important;}
      .hero-content{padding:80px 24px 24px 24px !important;}
      .hero-tagline{font-size:clamp(36px,9vw,48px) !important;}
      .hero-begin-btn{max-width:100% !important;width:100% !important;}
      .hero-char-row{gap:16px !important;padding:64px 16px 32px 56px !important;overflow-x:auto !important;justify-content:flex-start !important;}
      .hero-char-svg{width:70px !important;height:88px !important;}
      .panels-row{flex-direction:column !important;}
      .panel-btn{min-height:360px !important;border-right:none !important;border-bottom:1px solid #141414 !important;padding:40px 24px !important;}
      .panel-char-box{width:130px !important;height:auto !important;margin-bottom:24px !important;}
      .panel-label{font-size:14px !important;}
      .panel-subtitle{font-size:13px !important;}
      .hero-living-room-mobile{display:block !important;}
      .hero-music-hint-mobile{display:block !important;}
      .landing-nav{position:fixed !important;z-index:20 !important;top:20px !important;left:24px !important;right:auto !important;padding:0 !important;}
      .music-widget-mobile{width:100vw !important;left:0 !important;right:0 !important;border-radius:0 !important;}
      .music-widget-iframe-mobile{height:120px !important;}
    }
  `;

  const BASE = { minHeight:"100vh", background:"#0E0D0B", color:"#E9E5DC", fontFamily:"'Manrope',sans-serif", fontWeight:300 };

  // ── WELCOME (first-time vs returning, shown on every session entry) ─────────
  if (screen === "welcome") {
    const TUTORIAL_LINES = lang === "id"
      ? [
          "Profess melatihmu untuk percakapan dunia nyata.",
          "Pilih skenario, lalu ngobrol dengan karakter AI.",
          "Coach akan memberi masukan setelah sesi selesai.",
          "Putar globe untuk mulai. Selamat berlatih!",
        ]
      : [
          "Profess trains you for real-world conversations.",
          "Pick a scenario, then talk with an AI character.",
          "A coach gives feedback once the session ends.",
          "Spin the globe to begin. Good luck!",
        ];

    const askText = lang === "id"
      ? "Apakah ini kali pertama anda menggunakan Profess?"
      : "Is it your first time here?";
    const backText = lang === "id" ? "Selamat datang kembali!" : "Welcome back!";

    return (
      <div className="screen-enter" style={{ ...BASE, height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", padding:"24px", textAlign:"center", gap:"28px" }}>
        <style>{css}</style>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:-1 }}><DottedGlowBackground/></div>

        {welcomeStep === "ask" && (
          <>
            <TextFlippingBoard key="ask" text={askText}/>
            <div style={{ display:"flex", gap:"16px" }}>
              <button
                onClick={() => { setTutorialIdx(0); setWelcomeStep("tutorial"); }}
                style={{ background:"none", border:"1px solid #C8A458", color:"#C8A458", fontFamily:"'Manrope',sans-serif", fontSize:"12px", letterSpacing:".1em", textTransform:"uppercase", padding:"12px 28px", cursor:"pointer" }}
              >
                {lang === "id" ? "Ya" : "Yes"}
              </button>
              <button
                onClick={() => setWelcomeStep("back")}
                style={{ background:"none", border:"1px solid #2A2520", color:"#8A8478", fontFamily:"'Manrope',sans-serif", fontSize:"12px", letterSpacing:".1em", textTransform:"uppercase", padding:"12px 28px", cursor:"pointer" }}
              >
                {lang === "id" ? "Tidak" : "No"}
              </button>
            </div>
          </>
        )}

        {welcomeStep === "tutorial" && (
          <>
            <TextFlippingBoard key={"tut"+tutorialIdx} text={TUTORIAL_LINES[tutorialIdx]}/>
            <button
              onClick={() => {
                if (tutorialIdx < TUTORIAL_LINES.length - 1) setTutorialIdx(i => i + 1);
                else setScreen("intro");
              }}
              style={{ background:"none", border:"1px solid #C8A458", color:"#C8A458", fontFamily:"'Manrope',sans-serif", fontSize:"12px", letterSpacing:".1em", textTransform:"uppercase", padding:"12px 28px", cursor:"pointer" }}
            >
              {tutorialIdx < TUTORIAL_LINES.length - 1 ? (lang === "id" ? "Lanjut" : "Next") : (lang === "id" ? "Mulai" : "Start")}
            </button>
          </>
        )}

        {welcomeStep === "back" && (
          <>
            <TextFlippingBoard key="back" text={backText}/>
            <button
              onClick={() => setScreen("intro")}
              style={{ background:"none", border:"1px solid #C8A458", color:"#C8A458", fontFamily:"'Manrope',sans-serif", fontSize:"12px", letterSpacing:".1em", textTransform:"uppercase", padding:"12px 28px", cursor:"pointer" }}
            >
              {lang === "id" ? "Lanjutkan" : "Continue"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── INTRO (globe-only gate, before the landing page) ────────────────────────
  if (screen === "intro") {
    return (
      <div className="screen-enter" style={{ ...BASE, height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", padding:"24px", textAlign:"center" }}>
        <style>{css}</style>
        {introOverlay}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:-1 }}><DottedGlowBackground/></div>
        <div style={{ maxWidth:"480px", marginBottom:"4px" }}>
          <p style={{ fontSize:"9px", letterSpacing:".2em", textTransform:"uppercase", color:"#2A2520", marginBottom:"10px" }}>
            {lang==="id" ? "Sebelum Memulai" : "Before You Begin"}
          </p>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(20px,2.6vw,28px)", color:"#C8A458", lineHeight:1.5, marginBottom:"10px", fontWeight:400 }}>
            {lang==="id"
              ? "Setiap titik di globe ini adalah percakapan yang bisa terjadi — di kota manapun, dengan siapapun."
              : "Every point on this globe is a conversation that could happen — in any city, with anyone."}
          </h1>
          <p style={{ fontSize:"12px", color:"#8A8478", lineHeight:1.7 }}>
            {lang==="id"
              ? "Profess melatihmu untuk percakapan dunia nyata itu lebih dulu, dengan aman."
              : "Profess trains you for those real-world conversations first, safely."}
          </p>
        </div>
        <div style={{ width:"min(90vw,420px)" }}>
          <Globe3D dots={WORLD_MAP_DOTS} onSpun={handleGlobeSpun} onProgress={setSpinProgress}/>
        </div>
        <div style={{ width:"min(90vw,220px)", height:"3px", background:"#1A1A1A", borderRadius:"2px", overflow:"hidden", marginTop:"4px" }}>
          <div style={{ width:`${Math.round(spinProgress*100)}%`, height:"100%", background:"#C8A870", transition:"width .1s linear" }}/>
        </div>
        <p style={{ fontSize:"10px", letterSpacing:".15em", textTransform:"uppercase", color:"#C8A870", opacity:.85 }}>
          {lang==="id" ? "Putar globe untuk melanjutkan" : "Spin the globe to continue"}
        </p>
      </div>
    );
  }

  // ── LANDING ────────────────────────────────────────────────────────────────
  if (screen === "landing") {
    const heroRoleDesc = r => ({ interviewer:"Formal — interviews & performance reviews", reviewer:"Formal — interviews & performance reviews", auditor:"Formal — interviews & performance reviews", examiner:"Formal — thesis defense & academic sessions", professor_academic:"Formal — thesis defense & academic sessions", dean:"Formal — thesis defense & academic sessions", journalist:"Formal — press conferences & media training", critic:"Formal — press conferences & media training", judge:"Formal — mock trials & debate adjudication", prosecutor:"Formal — mock trials & debate adjudication", cross_examiner:"Formal — mock trials & debate adjudication", friend_female:"Social — reconnecting & casual conversation", friend_male:"Social — reconnecting & casual conversation", best_friend:"Social — reconnecting & casual conversation", colleague:"Social — workplace dynamics & office talk", manager:"Social — workplace dynamics & office talk", subordinate:"Social — workplace dynamics & office talk", crush:"Social — romantic & flirtatious situations", romantic_interest:"Social — romantic & flirtatious situations", date:"Social — romantic & flirtatious situations", stranger:"Social — first impressions & small talk", new_acquaintance:"Social — first impressions & small talk", negotiator:"Formal — pitching, negotiation & boardroom", ceo:"Formal — pitching, negotiation & boardroom", executive:"Formal — pitching, negotiation & boardroom", acquirer:"Formal — pitching, negotiation & boardroom", parent:"Social — family conversations", grandparent:"Social — family conversations", calon_mertua:"Social — family conversations", mentor:"Formal — mentorship & guidance sessions", senior:"Formal — mentorship & guidance sessions" }[r] || "Available across all session types");
    const { sofaLeft, sofaRight, beginPanel, aboutPanel, termsPanel, heroRow } = landingChars.current;
    const roomMaleMood = agitated.roomMale ? "uncomfortable" : roomMood;
    const roomFemaleMood = agitated.roomFemale ? "uncomfortable" : roomMood;
    const livingRoomMale = useMemo(() => buildSVG(sofaLeft, roomMaleMood, false, "livingroom"), [sofaLeft, roomMaleMood]);
    const livingRoomFemale = useMemo(() => buildSVG(sofaRight, roomFemaleMood, false, "livingroom"), [sofaRight, roomFemaleMood]);
    const aboutRole = aboutPanel.role;
    const panelCharAbout = useMemo(() => buildSVG(aboutPanel.char, "neutral", false), [aboutPanel.char]);
    const aboutIdleAnim = { journalist:"journalistSway 3s ease-in-out infinite", friend_female:"friendBob 2.8s ease-in-out infinite", colleague:"idleBreathe 3.5s ease-in-out infinite", interviewer:"negotiatorLean 4s ease-in-out infinite" }[aboutRole] || "idleBreathe 3.5s ease-in-out infinite";
    const panelCharTerms = useMemo(() => buildSVG(termsPanel, "serious", false), [termsPanel]);
    const panelCharBegin = useMemo(() => buildSVG(beginPanel, "neutral", false), [beginPanel]);
    const heroRoleAnims = ["negotiatorLean 4s ease-in-out infinite","idleBreathe 3.5s ease-in-out infinite","friendBob 2.8s ease-in-out infinite","negotiatorLean 4s ease-in-out infinite"];
    const heroSvgs = useMemo(
      () => heroRow.map((charObj, i) => buildSVG(charObj, agitated["hero"+i] ? "uncomfortable" : "neutral", false, "role")),
      [heroRow, agitated]
    );

    const TERMS_SECTIONS = [
      { title:"Nature of the service", body:"Profess is a communication training tool. It is not a licensed therapist, career counselor, legal advisor, or qualified professional of any kind. All feedback generated during sessions is for practice purposes only and should not be treated as professional guidance." },
      { title:"Simulated characters", body:"All characters that appear in Profess sessions — interviewers, examiners, judges, friends, colleagues — are AI simulations. Their responses do not represent the actual standards, judgments, behavior, or views of any real institution, profession, or individual." },
      { title:"No professional advice", body:"Profess may make errors in reasoning, miss important nuances, or reflect biases present in its training data. Do not rely on Profess as the sole basis for any real-world professional, academic, legal, or personal decision." },
      { title:"User conduct", body:"Profess will not engage with requests to portray religious figures, convicted criminals, terrorists, historical dictators, or real public figures in roleplay. Sessions involving abusive, offensive, or sexually explicit content will be paused." },
      { title:"Data and privacy", body:"Conversation content is processed to generate AI responses and is not stored beyond the active session. No personally identifiable information is retained after the session ends." },
      { title:"Limitation of liability", body:"Profess is provided as-is without warranties of any kind. The creators of Profess accept no liability for decisions made based on content generated during sessions, or for any direct, indirect, incidental, or consequential damages arising from use of the service." },
    ];

    return (
      <>
      <div ref={landingScrollRef} className="screen-enter" style={{ ...BASE, overflowY:"auto", filter:warmMode?"sepia(0.18) saturate(1.2) brightness(1.02)":"none", transition:"filter 1.2s ease" }}>
        <style>{css}</style>
        {introOverlay}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:-1 }}><DottedGlowBackground/></div>
        <div className="grain-layer"/>
        {/* Warm mode ambient overlay */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:998, background:"radial-gradient(ellipse at 65% 40%, rgba(180,100,20,0.12) 0%, rgba(140,70,10,0.06) 50%, transparent 80%)", opacity:warmMode?1:0, transition:"opacity 1.5s ease" }}/>

     {/* Mobile popup: recommend desktop for best music experience — shown when radio is pressed, before YouTube embed starts */}
{isMobile && showDesktopMusicHint && (
  <div
    style={{
      position:"fixed",
      left: radioNotePos.left,
      top: radioNotePos.top,
      transform:"translate(-50%, -100%)",
      zIndex:1000,
      width:"260px",
      background:"#0E0E0E",
      border:"1px solid #2A2520",
      padding:"24px 20px",
      textAlign:"center",
      boxShadow:"0 8px 32px rgba(0,0,0,0.45)"
    }}
  >
    <p
      style={{
        fontFamily:"'Playfair Display',serif",
        fontSize:"14px",
        color:"#C8A870",
        marginBottom:"12px"
      }}
    >
      {lang==="id" ? "Catatan" : "Note"}
    </p>

    <p
      style={{
        fontSize:"13px",
        lineHeight:1.7,
        color:"#C8A458",
        marginBottom:"20px"
      }}
    >
      {lang==="id"
        ? "Untuk pengalaman mendengarkan musik yang terbaik, gunakan mode desktop."
        : "For the best music listening experience, use desktop mode."}
    </p>

    <button
      onClick={() => {
        mobileMusicConfirmed.current = true;
        setShowDesktopMusicHint(false);
        hasOpenedMusic.current = true;
        setShowMusicSuggest(false);
        setShowPlayer(true);
      }}
      style={{
        background:"none",
        border:"1px solid #C8A458",
        color:"#C8A458",
        fontFamily:"'Manrope',sans-serif",
        fontSize:"11px",
        letterSpacing:".08em",
        textTransform:"uppercase",
        padding:"8px 20px",
        cursor:"pointer"
      }}
    >
      {lang==="id" ? "Lanjutkan" : "Continue"}
    </button>
  </div>
)}

        {/* ── HERO — full viewport height ── */}
        <div className="hero-section" style={{ position:"relative", height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden", paddingBottom:"0" }}>
          {/* Nav */}
          <nav className="landing-nav" style={{ position:"absolute", top:0, left:0, right:0, padding:"24px 40px", display:"flex", alignItems:"center", zIndex:10 }}>
            <div>
              <SquigglyText style={{ fontFamily:"'Playfair Display',serif", fontSize:"22px", fontWeight:500, letterSpacing:".06em" }}>Profess</SquigglyText>
              <div style={{ width:"32px", height:"1px", background:"#C8A870", marginTop:"5px" }}/>
            </div>
          </nav>

          {/* Living room illustration */}
          <div className="hero-living-room" style={{ position:"absolute", right:0, top:0, height:"100%", width:"45%", opacity: warmMode ? 0.55 : 0.35, transition:"opacity 1.2s ease", zIndex:1 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width:"100%", height:"100%" }}>
              <defs>
                <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#D4A020" stopOpacity="0.9"/>
                  <stop offset="55%" stopColor="#C8900A" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#C8900A" stopOpacity="0"/>
                </radialGradient>
                <linearGradient id="tableTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#5E7050"/>
                  <stop offset="55%" stopColor="#4B5A3A"/>
                  <stop offset="100%" stopColor="#384429"/>
                </linearGradient>
                <linearGradient id="tableLegGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3A2C1C"/>
                  <stop offset="50%" stopColor="#2F2418"/>
                  <stop offset="100%" stopColor="#241A10"/>
                </linearGradient>
                <linearGradient id="radioBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#5C5C66"/>
                  <stop offset="45%" stopColor="#4A4A52"/>
                  <stop offset="100%" stopColor="#36363E"/>
                </linearGradient>
                <linearGradient id="lampShadeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={warmMode ? "#E8B840" : "#36240E"}/>
                  <stop offset="50%" stopColor={warmMode ? "#D4A020" : "#2A1A08"}/>
                  <stop offset="100%" stopColor={warmMode ? "#B4860E" : "#1E1206"}/>
                </linearGradient>
                <linearGradient id="lampBaseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A0824E"/>
                  <stop offset="50%" stopColor="#8C6A3C"/>
                  <stop offset="100%" stopColor="#6E5230"/>
                </linearGradient>
                <pattern id="radioGrilleHero" width="1" height="1" patternUnits="userSpaceOnUse">
                  <circle cx="0.5" cy="0.5" r="0.22" fill="#26262E"/>
                </pattern>
              </defs>
              {/* Floor */}
              <line x1="0" y1="75" x2="100" y2="75" stroke="#2A2010" strokeWidth="0.3" opacity="0.7"/>
              {/* Rug */}
              <ellipse cx="50" cy="75.5" rx="35" ry="4" fill="#2A1A0A" opacity="0.4"/>
              {/* Left character — full social-role render, with its own sofa/seat props */}
              <foreignObject x="2" y="38" width="36" height="40" overflow="visible" opacity={warmMode ? 0.75 : 0.45}>
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:"100%", height:"100%", perspective:"900px" }}>
                  <div style={{ width:"100%", height:"100%", transformStyle:"preserve-3d", transition:"transform .2s ease-linear" }} onMouseMove={bodyTiltMove("roomMale")} onTouchMove={bodyTiltMove("roomMale")} onMouseLeave={bodyTiltLeave("roomMale")} onTouchEnd={bodyTiltLeave("roomMale")}>
                    <div style={{ width:"100%", height:"100%", animation:"friendBob 3.2s ease-in-out infinite" }} dangerouslySetInnerHTML={{ __html: livingRoomMale }}/>
                  </div>
                </div>
              </foreignObject>
              {/* Right character — full social-role render, with its own sofa/seat props */}
              <foreignObject x="62" y="38" width="34" height="38" overflow="visible" opacity={warmMode ? 0.75 : 0.45}>
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:"100%", height:"100%", perspective:"900px" }}>
                  <div style={{ width:"100%", height:"100%", transformStyle:"preserve-3d", transition:"transform .2s ease-linear" }} onMouseMove={bodyTiltMove("roomFemale")} onTouchMove={bodyTiltMove("roomFemale")} onMouseLeave={bodyTiltLeave("roomFemale")} onTouchEnd={bodyTiltLeave("roomFemale")}>
                    <div style={{ width:"100%", height:"100%", animation:"friendBob 2.8s ease-in-out infinite", animationDelay:"0.4s" }} dangerouslySetInnerHTML={{ __html: livingRoomFemale }}/>
                  </div>
                </div>
              </foreignObject>
              {/* Standing lamp — behind the table, back layer */}
              {warmMode && <circle cx="46" cy="58" r="11" fill="url(#lampGlow)" opacity="0.45"/>}
              <ellipse cx="46" cy="75.3" rx="3.2" ry="0.6" fill="#000" opacity="0.25"/>
              <rect x="45" y="55" width="2" height="19" rx="0.6" fill="url(#lampBaseGrad)"/>
              <polygon points="42,55 50,55 48.3,46 43.7,46" fill="url(#lampShadeGrad)" stroke="#4A3020" strokeWidth="0.3"/>
              <line x1="43.6" y1="54.3" x2="45.3" y2="46.6" stroke={warmMode ? "#F8D880" : "#5A4020"} strokeWidth="0.25" opacity="0.45"/>
              <circle cx="46" cy="45.2" r="0.6" fill="#A8854C"/>
              <rect x="43" y="73.6" width="6" height="1.2" rx="0.5" fill="#3E2C18"/>

              {/* Coffee table — soft contact shadow */}
              <ellipse cx="50" cy="79.5" rx="13" ry="1.2" fill="#000" opacity="0.25"/>
              {/* Coffee table — top */}
              <rect x="38" y="68" width="24" height="7" rx="1.5" fill="url(#tableTopGrad)" stroke="#2A2014" strokeWidth="0.25"/>
              {/* Coffee table — lighter top surface */}
              <rect x="38.5" y="68" width="23" height="3.5" rx="1" fill="#5E7050" opacity="0.55"/>
              {/* Coffee table — top edge highlight */}
              <line x1="39" y1="68.3" x2="61" y2="68.3" stroke="#7A8C68" strokeWidth="0.3" opacity="0.5"/>
              {/* Coffee table — wood-grain texture lines */}
              <line x1="40" y1="71.5" x2="60" y2="71.5" stroke="#2C3520" strokeWidth="0.15" opacity="0.4"/>
              <line x1="40" y1="73" x2="60" y2="73" stroke="#2C3520" strokeWidth="0.15" opacity="0.3"/>
              {/* Coffee table — mug prop */}
              <ellipse cx="53.5" cy="67.8" rx="1.9" ry="0.6" fill="#241A10" opacity="0.5"/>
              <rect x="51.7" y="65.3" width="3.7" height="2.6" rx="0.6" fill="#C8A458" opacity="0.85"/>
              <path d="M55.4 65.9 q1.3 0.4 0 1.5" stroke="#C8A458" strokeWidth="0.35" fill="none" opacity="0.85"/>
              {/* Coffee table — legs */}
              <rect x="39.5" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGrad)"/>
              <rect x="44" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGrad)"/>
              <rect x="54" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGrad)"/>
              <rect x="58" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGrad)"/>
              {/* Radio side table — contact shadow */}
              <ellipse cx="85.5" cy="80.3" rx="7.5" ry="0.8" fill="#000" opacity="0.25"/>
              {/* Radio side table */}
              <rect x="78.5" y="74" width="14" height="2" rx="0.5" fill="#2A1808" opacity="0.9"/>
              <rect x="79.5" y="76" width="3" height="3.5" rx="0.3" fill="#221408"/>
              <rect x="87.5" y="76" width="3" height="3.5" rx="0.3" fill="#221408"/>
              {/* Radio body */}
              <rect x="79" y="66" width="13" height="8" rx="1" fill="url(#radioBodyGrad)" stroke="#64646C" strokeWidth="0.4"/>
              {/* Radio body — top edge highlight */}
              <line x1="79.5" y1="66.4" x2="91.5" y2="66.4" stroke="#7A7A82" strokeWidth="0.25" opacity="0.6"/>
              {/* Radio speaker grille — dot mesh */}
              <rect x="80" y="67.3" width="7" height="5.6" rx="0.6" fill="url(#radioGrilleHero)" stroke="#2E2E36" strokeWidth="0.2" opacity="0.95"/>
              {/* Radio knobs — with rim shading */}
              <circle cx="89.3" cy="68.2" r="1.05" fill="#6A6A72" stroke="#3A3A42" strokeWidth="0.15"/>
              <circle cx="89" cy="67.85" r="0.3" fill="#8A8A92" opacity="0.8"/>
              <circle cx="89.3" cy="71" r="1.05" fill="#6A6A72" stroke="#3A3A42" strokeWidth="0.15"/>
              <circle cx="89" cy="70.65" r="0.3" fill="#8A8A92" opacity="0.8"/>
              {/* Radio antenna */}
              <line x1="91.2" y1="66" x2="94.5" y2="60.5" stroke="#5A5A62" strokeWidth="0.6" style={showPlayer ? {animation:"antennaP 1s ease-in-out infinite"} : {opacity:0.5}}/>
            </svg>
            {/* Lamp click area — separate from pointer-events:none wrapper */}
          </div>
          {/* Lamp hint text */}
          <div className="hero-lamp-hint" style={{ position:"absolute", right:"28%", top:"30%", pointerEvents:"none", zIndex:6, textAlign:"center", transition:"color 1.2s ease" }}>
            <p style={{ fontFamily:"'Manrope',sans-serif", fontWeight:300, fontSize:"9px", letterSpacing:".14em", textTransform:"uppercase", color:"#C8A870", opacity:1.00, whiteSpace:"nowrap", transition:"color 1.2s ease" }}>
              {warmMode ? "warm mode on" : "click the lamp"}
            </p>
            <span style={{ display:"block", width:"3px", height:"3px", borderRadius:"50%", background:"#C8A870", margin:"4px auto 0", animation:"pulse 1.5s ease-in-out infinite", transition:"background 1.2s ease" }}/>
          </div>
          {/* Lamp click overlay */}
          <div className="hero-lamp-overlay" onClick={() => { setWarmMode(w => { const next = !w; setRoomMood(next ? "warm" : "neutral"); return next; }); }} title={warmMode ? "warm mode on" : "click the lamp"} style={{ position:"absolute", right:"24%", top:"38%", width:"14%", height:"34%", cursor:"pointer", zIndex:7 }}/>
    {/* Radio hint text */}
<div
  className="hero-radio-hint"
  onClick={() => {
    hasOpenedMusic.current = true;
    setShowMusicSuggest(false);
    setShowPlayer(p => !p);
  }}
  title="Toggle music player"
  style={{
    position:"absolute",
    right:"8%",
    bottom:"30%",
    pointerEvents:"all",
    cursor:"pointer",
    zIndex:8,
    textAlign:"center",
    transition:"color 0.8s ease"
  }}
>
  <p
    style={{
      fontFamily:"'Manrope',sans-serif",
      fontWeight:300,
      fontSize:"8px",
      letterSpacing:".12em",
      textTransform:"uppercase",
      color:"#C8A870",
      opacity:showPlayer ? 0.9 : 0.75,
      whiteSpace:"nowrap",
      transition:"color 0.8s ease, opacity 0.8s ease"
    }}
  >
    {showPlayer ? "music on" : "press radio for music"}
  </p>

  <span
    style={{
      display:"block",
      width:"3px",
      height:"3px",
      borderRadius:"50%",
      background:"#C8A870",
      margin:"4px auto 0"
    }}
  />
</div>
          {/* Radio click overlay — covers full radio body, knobs, antenna and surrounding area */}
          <div className="hero-radio-overlay" onClick={() => { hasOpenedMusic.current = true; setShowMusicSuggest(false); setShowPlayer(p => !p); }} title="Toggle music player" style={{ position:"absolute", right:"4%", top:"60%", width:"9%", height:"14%", cursor:"pointer", zIndex:8 }}/>

          {/* Hero content */}
          <div className="hero-content" style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"flex-start", justifyContent:"center", padding:"80px 40px 0 clamp(40px,8vw,140px)", position:"relative", zIndex:2 }}>
            <div style={{ maxWidth:"640px", width:"100%", display:"flex", flexDirection:"column", gap:"24px" }}>
              <div>
                <p style={{ fontSize:"9px", letterSpacing:".2em", textTransform:"uppercase", color:"#2A2520", marginBottom:"16px" }}>Communication Training</p>
                <h1 className="hero-tagline" style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(40px,5vw,60px)", fontWeight:400, lineHeight:1.15, color:"#E9E5DC", letterSpacing:"-.01em" }}>
                  <SquigglyText as="div">Every conversation<br/>
                  has another side.</SquigglyText>
                </h1>
              </div>
              <div style={{ width:"100px", height:"1px", background:"#D4B47C" }}/>
              <motion.p initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                transition={{ duration:0.6, delay:0.4, ease:[0.22,1,0.36,1] }}
                style={{ fontSize:"15px", lineHeight:1.8, color:"#C8A458", maxWidth:"480px" }}>
                Explore how your ideas, decisions, and messages may be received before the real conversation begins.
              </motion.p>
              <div>
                <button className="hero-begin-btn" onClick={() => setScreen("lang")}
                  style={{ background:"none", border:"1px solid #C8A458", color:"#E9E5DC", fontFamily:"'Playfair Display',serif", fontSize:"14px", fontStyle:"italic", minWidth:"200px", height:"48px", display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:".04em", transition:"background .25s, border-color .25s, color .25s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background="rgba(200,168,112,0.05)"; e.currentTarget.style.borderColor="#C8A870"; e.currentTarget.style.color="#C8A870"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.borderColor="#C8A458"; e.currentTarget.style.color="#E9E5DC"; }}>
                  Begin
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Mobile living room scene — shown only on mobile, between Begin button and character row */}
        <div className="hero-living-room-mobile" style={{ display:"none", width:"100%", height:"300px", overflow:"hidden", opacity: warmMode ? 0.7 : 0.55, transition:"opacity 1.2s ease" }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width:"100%", height:"100%" }}>
            <defs>
              <radialGradient id="lampGlowMobile" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#D4A020" stopOpacity="0.9"/>
                <stop offset="55%" stopColor="#C8900A" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#C8900A" stopOpacity="0"/>
              </radialGradient>
              <linearGradient id="tableTopGradMobile" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5E7050"/>
                <stop offset="55%" stopColor="#4B5A3A"/>
                <stop offset="100%" stopColor="#384429"/>
              </linearGradient>
              <linearGradient id="tableLegGradMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3A2C1C"/>
                <stop offset="50%" stopColor="#2F2418"/>
                <stop offset="100%" stopColor="#241A10"/>
              </linearGradient>
              <linearGradient id="radioBodyGradMobile" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5C5C66"/>
                <stop offset="45%" stopColor="#4A4A52"/>
                <stop offset="100%" stopColor="#36363E"/>
              </linearGradient>
              <linearGradient id="lampShadeGradMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={warmMode ? "#E8B840" : "#36240E"}/>
                <stop offset="50%" stopColor={warmMode ? "#D4A020" : "#2A1A08"}/>
                <stop offset="100%" stopColor={warmMode ? "#B4860E" : "#1E1206"}/>
              </linearGradient>
              <linearGradient id="lampBaseGradMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A0824E"/>
                <stop offset="50%" stopColor="#8C6A3C"/>
                <stop offset="100%" stopColor="#6E5230"/>
              </linearGradient>
              <pattern id="radioGrilleHeroMobile" width="1" height="1" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.22" fill="#26262E"/>
              </pattern>
            </defs>
            <line x1="0" y1="75" x2="100" y2="75" stroke="#2A2010" strokeWidth="0.3" opacity="0.7"/>
            <ellipse cx="50" cy="75.5" rx="35" ry="4" fill="#2A1A0A" opacity="0.4"/>
            <foreignObject x="-4" y="32" width="48" height="54" overflow="visible" opacity={1}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:"100%", height:"100%", perspective:"900px" }}>
                <div data-gyro-tilt="1" style={{ width:"100%", height:"100%", transformStyle:"preserve-3d", transition:"transform .2s ease-linear" }} onMouseMove={bodyTiltMove("roomMale")} onTouchMove={bodyTiltMove("roomMale")} onMouseLeave={bodyTiltLeave("roomMale")} onTouchEnd={bodyTiltLeave("roomMale")}>
                  <div style={{ width:"100%", height:"100%", animation:"friendBob 3.2s ease-in-out infinite" }} dangerouslySetInnerHTML={{ __html: livingRoomMale }}/>
                </div>
              </div>
            </foreignObject>
            <foreignObject x="56" y="32" width="46" height="52" overflow="visible" opacity={1}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:"100%", height:"100%", perspective:"900px" }}>
                <div data-gyro-tilt="1" style={{ width:"100%", height:"100%", transformStyle:"preserve-3d", transition:"transform .2s ease-linear" }} onMouseMove={bodyTiltMove("roomFemale")} onTouchMove={bodyTiltMove("roomFemale")} onMouseLeave={bodyTiltLeave("roomFemale")} onTouchEnd={bodyTiltLeave("roomFemale")}>
                  <div style={{ width:"100%", height:"100%", animation:"friendBob 2.8s ease-in-out infinite", animationDelay:"0.4s" }} dangerouslySetInnerHTML={{ __html: livingRoomFemale }}/>
                </div>
              </div>
            </foreignObject>
            {/* Standing lamp — behind the table, back layer */}
            <text x="46" y="42" textAnchor="middle" fill="#C8B090" fontSize="2.2" opacity="0.8" letterSpacing="0.4" > {lang==="id" ? "CLICK THE LAMP" : "CLICK THE LAMP"} </text>
            {warmMode && <circle cx="46" cy="58" r="11" fill="url(#lampGlowMobile)" opacity="0.45"/>}
            <ellipse cx="46" cy="75.3" rx="3.2" ry="0.6" fill="#000" opacity="0.25"/>
            <g onClick={() => { setWarmMode(w => { const next = !w; setRoomMood(next ? "warm" : "neutral"); return next; }); }} style={{ cursor:"pointer" }}>
              <rect x="45" y="55" width="2" height="19" rx="0.6" fill="url(#lampBaseGradMobile)"/>
              <polygon points="42,55 50,55 48.3,46 43.7,46" fill="url(#lampShadeGradMobile)" stroke="#4A3020" strokeWidth="0.3"/>
              <line x1="43.6" y1="54.3" x2="45.3" y2="46.6" stroke={warmMode ? "#F8D880" : "#5A4020"} strokeWidth="0.25" opacity="0.45"/>
              <circle cx="46" cy="45.2" r="0.6" fill="#A8854C"/>
              <rect x="43" y="73.6" width="6" height="1.2" rx="0.5" fill="#3E2C18"/>
              <rect x="38" y="40" width="18" height="36" fill="transparent"/>
            </g>
            <ellipse cx="50" cy="79.5" rx="13" ry="1.2" fill="#000" opacity="0.25"/>
            <rect x="38" y="68" width="24" height="7" rx="1.5" fill="url(#tableTopGradMobile)" stroke="#2A2014" strokeWidth="0.25"/>
            <rect x="38.5" y="68" width="23" height="3.5" rx="1" fill="#5E7050" opacity="0.55"/>
            <line x1="39" y1="68.3" x2="61" y2="68.3" stroke="#7A8C68" strokeWidth="0.3" opacity="0.5"/>
            <line x1="40" y1="71.5" x2="60" y2="71.5" stroke="#2C3520" strokeWidth="0.15" opacity="0.4"/>
            <line x1="40" y1="73" x2="60" y2="73" stroke="#2C3520" strokeWidth="0.15" opacity="0.3"/>
            <ellipse cx="53.5" cy="67.8" rx="1.9" ry="0.6" fill="#241A10" opacity="0.5"/>
            <rect x="51.7" y="65.3" width="3.7" height="2.6" rx="0.6" fill="#C8A458" opacity="0.85"/>
            <path d="M55.4 65.9 q1.3 0.4 0 1.5" stroke="#C8A458" strokeWidth="0.35" fill="none" opacity="0.85"/>
            <rect x="39.5" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGradMobile)"/>
            <rect x="44" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGradMobile)"/>
            <rect x="54" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGradMobile)"/>
            <rect x="58" y="75" width="2.5" height="4" rx="0.5" fill="url(#tableLegGradMobile)"/>
            {/* Radio — same relative position/scale as desktop */}
            <text x="92" y="58" textAnchor="end" fill="#C8B090" fontSize="2" opacity="0.8" letterSpacing="0.3">{lang==="id" ? "PRESS THE RADIO FOR MUSIC" : "PRESS THE RADIO FOR MUSIC"}</text>
            <ellipse cx="85.5" cy="80.3" rx="7.5" ry="0.8" fill="#000" opacity="0.25"/>
            <g ref={radioMobileRef} onClick={() => { if (!mobileMusicConfirmed.current) { const r = radioMobileRef.current?.getBoundingClientRect(); if (r) setRadioNotePos({ left: r.left + r.width/2, top: r.top - 8 }); setShowDesktopMusicHint(true); return; } hasOpenedMusic.current = true; setShowMusicSuggest(false); setShowPlayer(p => !p); }} style={{ cursor:"pointer" }}>
              <rect x="78.5" y="74" width="14" height="2" rx="0.5" fill="#2A1808" opacity="0.9"/>
              <rect x="79.5" y="76" width="3" height="3.5" rx="0.3" fill="#221408"/>
              <rect x="87.5" y="76" width="3" height="3.5" rx="0.3" fill="#221408"/>
              <rect x="79" y="66" width="13" height="8" rx="1" fill="url(#radioBodyGradMobile)" stroke="#64646C" strokeWidth="0.4"/>
              <line x1="79.5" y1="66.4" x2="91.5" y2="66.4" stroke="#7A7A82" strokeWidth="0.25" opacity="0.6"/>
              <rect x="80" y="67.3" width="7" height="5.6" rx="0.6" fill="url(#radioGrilleHeroMobile)" stroke="#2E2E36" strokeWidth="0.2" opacity="0.95"/>
              <circle cx="89.3" cy="68.2" r="1.05" fill="#6A6A72" stroke="#3A3A42" strokeWidth="0.15"/>
              <circle cx="89" cy="67.85" r="0.3" fill="#8A8A92" opacity="0.8"/>
              <circle cx="89.3" cy="71" r="1.05" fill="#6A6A72" stroke="#3A3A42" strokeWidth="0.15"/>
              <circle cx="89" cy="70.65" r="0.3" fill="#8A8A92" opacity="0.8"/>
              <line x1="91.2" y1="66" x2="94.5" y2="60.5" stroke="#5A5A62" strokeWidth="0.6" style={showPlayer ? {animation:"antennaP 1s ease-in-out infinite"} : {opacity:0.5}}/>
              <rect x="76" y="56" width="20" height="24" fill="transparent"/>
            </g>
          </svg>
          <p style={{ fontFamily:"'Manrope',sans-serif", fontWeight:300, fontSize:"10px", letterSpacing:".1em", color:"#3A3530", textAlign:"center", padding:"8px 0 0" }}>
            {lang==="id" ? "Untuk pengalaman musik terbaik, gunakan desktop" : "For the best music experience, use desktop"}
          </p>
        </div>

        {/* World map — sits between the living room and the character row */}
        <ScrollRevealSection isMobile={isMobile} style={{ background:"#060606", borderTop:"1px solid #141414" }}>
          <div ref={globeSectionRef} style={{ padding:"56px 40px 40px" }}>
            <div style={{ maxWidth:"960px", margin:"0 auto" }}>
              <p style={{ fontSize:"9px", letterSpacing:".2em", textTransform:"uppercase", color:"#2A2520", marginBottom:"8px", textAlign:"center" }}>
                {lang==="id" ? "Lintas Negara" : "Across Borders"}
              </p>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(20px,2.4vw,28px)", fontWeight:400, color:"#C8A458", textAlign:"center", marginBottom:"32px", lineHeight:1.5 }}>
                {lang==="id"
                  ? "Berbincang dengan karakter dari berbagai penjuru dunia, di Profess."
                  : "Talk with characters from every corner of the world, on Profess."}
              </h2>
              <Globe3D dots={WORLD_MAP_DOTS}/>
            </div>
          </div>
        </ScrollRevealSection>

     {/* Character row — between hero and panels */}
<ScrollRevealSection isMobile={isMobile}>
<div
  className="hero-char-row"
  style={{
    display:"flex",
    justifyContent:"center",
    alignItems:"flex-end",
    gap:"48px",
    padding:"48px 0 32px",
    background:"transparent",
    position:"relative",
    zIndex:2
  }}
>

  {/* Spacer untuk menambah area scroll di ujung kiri */}
  {isMobile && (
  <div
    style={{
      width:"35px",
      flexShrink:0
    }}
  />
)}

  {heroRow.map((charObj, i) => {
    const role = ["interviewer","colleague","crush","negotiator"][i];
    const svg = heroSvgs[i];

    return (
      <div
        key={i}
        style={{ position:"relative", flexShrink:0 }}
        onMouseEnter={() => setHoveredChar(i)}
        onMouseLeave={() => setHoveredChar(null)}
        onClick={() => setHoveredChar(h => h === i ? null : i)}
      >
        {/* Tooltip */}
        <div
          className="hero-tooltip"
          style={{
            position:"absolute",
            bottom:"100%",
            left:"50%",
            transform:"translateX(-50%)",
            marginBottom:"8px",
            background:"#0E0E0E",
            border:"1px solid #2A2520",
            padding:"10px 14px",
            opacity: hoveredChar === i ? 1 : 0,
            transition:"opacity 0.2s ease",
            pointerEvents:"none",
            zIndex:100,
            whiteSpace:"nowrap",
            textAlign:"center"
          }}
        >
          <p
            style={{
              fontFamily:"'Playfair Display',serif",
              fontSize:"13px",
              color: charObj.accent || "#C8A870",
              marginBottom:"4px"
            }}
          >
            {charObj.name || role}
          </p>

          <p
            style={{
              fontSize:"11px",
              color:"#C8A458",
              fontWeight:300,
              marginTop:"4px"
            }}
          >
            {heroRoleDesc(role)}
          </p>
        </div>

        <div className="hero-char-svg" style={{ width:"90px", height:"112px", perspective:"900px" }}>
          <div
            data-gyro-tilt="1"
            style={{ width:"100%", height:"100%", transformStyle:"preserve-3d", transition:"transform .2s ease-linear" }}
            onMouseMove={bodyTiltMove("hero"+i)}
            onMouseLeave={bodyTiltLeave("hero"+i)}
            onTouchMove={bodyTiltMove("hero"+i)}
            onTouchEnd={bodyTiltLeave("hero"+i)}
          >
            <div style={{ width:"100%", height:"100%", opacity:0.85, animation: heroRoleAnims[i] }} dangerouslySetInnerHTML={{ __html: svg }}/>
          </div>
        </div>
      </div>
    );
  })}
</div>
</ScrollRevealSection>

        {/* ── THREE-PANEL SECTION ── */}
        <ScrollRevealSection isMobile={isMobile}>
        <div style={{ position:"relative", background:"#060606", backgroundImage:"radial-gradient(circle, #1C1C1C 1px, transparent 1px)", backgroundSize:"24px 24px", borderTop:"1px solid #141414" }}>
          {/* Panels row */}
          <div className="panels-row" style={{ display:"flex", borderBottom:"1px solid #141414", perspective:"900px" }}>
            {/* PANEL 1 — BEGIN */}
            <button className="panel-btn" data-gyro-tilt="1" onClick={() => setScreen("lang")}
              style={{ flex:"1 1 0", minHeight:"420px", background:"#0A0A0A", border:"none", borderRight:"1px solid #141414", borderTop:expandedPanel==="begin"?"2px solid #C8A870":"2px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0", cursor:"pointer", padding:"40px 24px", transition:"background .25s, border-color .25s, transform .2s ease-linear", transformStyle:"preserve-3d", position:"relative", overflow:"hidden" }}
              onMouseMove={panelTiltMove}
              onTouchMove={panelTiltMove}
              onTouchEnd={panelTiltLeave}
              onMouseEnter={e=>{ e.currentTarget.style.background="#0E0E0E"; e.currentTarget.style.borderTopColor="#C8A870"; e.currentTarget.querySelector('.panel-char').style.opacity="1"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#0A0A0A"; e.currentTarget.style.borderTopColor="transparent"; e.currentTarget.querySelector('.panel-char').style.opacity="0.85"; panelTiltLeave(e); }}>
              <MagneticBox strength={0.25} maxDistance={22} style={{ display:"flex", flexDirection:"column", alignItems:"center" }} innerStyle={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div className="panel-char-box" style={{ position:"relative", width:"140px", marginBottom:"32px" }}>
                  <div style={{ position:"absolute", width:"140%", height:"140%", top:"-20%", left:"-20%", borderRadius:"50%", background:"radial-gradient(ellipse at center, #C8A87028 0%, #C8A87010 40%, transparent 70%)", animation:"auraBreath 3s ease-in-out infinite", "--aura-base":"0.24", pointerEvents:"none", zIndex:0, transition:"all 0.8s ease" }}/>
                  <div className="panel-char" style={{ width:"140px", opacity:.85, transition:"opacity .25s", position:"relative", zIndex:1, animation:"coachNod 4s ease-in-out infinite" }}
                    dangerouslySetInnerHTML={{ __html: panelCharBegin }}/>
                </div>
                <div style={{ textAlign:"center" }}>
                  <p className="panel-label" style={{ fontFamily:"'Playfair Display',serif", fontSize:"13px", letterSpacing:".15em", color:"#C8A870", marginBottom:"8px" }}>BEGIN</p>
                  <p className="panel-subtitle" style={{ fontSize:"12px", color:"#C8A458", fontWeight:300 }}>Start a session</p>
                </div>
              </MagneticBox>
            </button>

            {/* PANEL 2 — ABOUT */}
            <button className="panel-btn" data-gyro-tilt="1" onClick={() => setExpandedPanel(p => p==="about" ? null : "about")}
              style={{ flex:"1 1 0", minHeight:"420px", background:expandedPanel==="about"?"#0C0C0A":"#0A0A0A", border:"none", borderRight:"1px solid #141414", borderTop:expandedPanel==="about"?"2px solid #C8A870":"2px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0", cursor:"pointer", padding:"40px 24px", transition:"background .25s, border-color .25s, transform .2s ease-linear", transformStyle:"preserve-3d", position:"relative", overflow:"hidden" }}
              onMouseMove={panelTiltMove}
              onTouchMove={panelTiltMove}
              onTouchEnd={panelTiltLeave}
              onMouseEnter={e=>{ e.currentTarget.style.background="#0E0E0E"; e.currentTarget.style.borderTopColor="#C8A870"; e.currentTarget.querySelector('.panel-char').style.opacity="1"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=expandedPanel==="about"?"#0C0C0A":"#0A0A0A"; e.currentTarget.style.borderTopColor=expandedPanel==="about"?"#C8A870":"transparent"; e.currentTarget.querySelector('.panel-char').style.opacity="0.85"; panelTiltLeave(e); }}>
              <div className="panel-char-box" style={{ position:"relative", width:"140px", marginBottom:"32px" }}>
                <div style={{ position:"absolute", width:"140%", height:"140%", top:"-20%", left:"-20%", borderRadius:"50%", background:"radial-gradient(ellipse at center, #7A8AA028 0%, #7A8AA010 40%, transparent 70%)", animation:"auraBreath 3.4s ease-in-out infinite", "--aura-base":"0.24", pointerEvents:"none", zIndex:0, transition:"all 0.8s ease" }}/>
                <div className="panel-char" style={{ width:"140px", opacity:.85, transition:"opacity .25s", position:"relative", zIndex:1, animation:aboutIdleAnim }}
                  dangerouslySetInnerHTML={{ __html: panelCharAbout }}/>
              </div>
              <div style={{ textAlign:"center" }}>
                <p className="panel-label" style={{ fontFamily:"'Playfair Display',serif", fontSize:"13px", letterSpacing:".15em", color:"#C8A870", marginBottom:"8px" }}>ABOUT</p>
                <p className="panel-subtitle" style={{ fontSize:"12px", color:"#C8A458", fontWeight:300 }}>What is Profess</p>
              </div>
            </button>

            {/* PANEL 3 — TERMS */}
            <button className="panel-btn" data-gyro-tilt="1" onClick={() => setExpandedPanel(p => p==="terms" ? null : "terms")}
              style={{ flex:"1 1 0", minHeight:"420px", background:expandedPanel==="terms"?"#0C0C0A":"#0A0A0A", border:"none", borderTop:expandedPanel==="terms"?"2px solid #C8A870":"2px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0", cursor:"pointer", padding:"40px 24px", transition:"background .25s, border-color .25s, transform .2s ease-linear", transformStyle:"preserve-3d", position:"relative", overflow:"hidden" }}
              onMouseMove={panelTiltMove}
              onTouchMove={panelTiltMove}
              onTouchEnd={panelTiltLeave}
              onMouseEnter={e=>{ e.currentTarget.style.background="#0E0E0E"; e.currentTarget.style.borderTopColor="#C8A870"; e.currentTarget.querySelector('.panel-char').style.opacity="1"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=expandedPanel==="terms"?"#0C0C0A":"#0A0A0A"; e.currentTarget.style.borderTopColor=expandedPanel==="terms"?"#C8A870":"transparent"; e.currentTarget.querySelector('.panel-char').style.opacity="0.85"; panelTiltLeave(e); }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"32px" }}>
                <div className="panel-char-box" style={{ position:"relative", width:"140px" }}>
                  <div style={{ position:"absolute", width:"140%", height:"140%", top:"-20%", left:"-20%", borderRadius:"50%", background:"radial-gradient(ellipse at center, #4A404028 0%, #4A404010 40%, transparent 70%)", animation:"auraBreath 4s ease-in-out infinite", "--aura-base":"0.24", pointerEvents:"none", zIndex:0, transition:"all 0.8s ease" }}/>
                  <div className="panel-char" style={{ width:"140px", opacity:.85, transition:"opacity .25s", position:"relative", zIndex:1, animation:"judgeTap 5s ease-in-out infinite" }}
                    dangerouslySetInnerHTML={{ __html: panelCharTerms }}/>
                </div>
                {/* Gavel prop */}
                <svg width="48" height="32" viewBox="0 0 48 32" style={{ marginTop:"8px", opacity:.6 }}>
                  <g transform="rotate(-30,24,16)">
                    <rect x="9" y="10" width="30" height="10" rx="2" fill="#6A5030"/>
                    <rect x="22" y="20" width="4" height="20" rx="1" fill="#8A6840"/>
                  </g>
                </svg>
              </div>
              <div style={{ textAlign:"center" }}>
                <p className="panel-label" style={{ fontFamily:"'Playfair Display',serif", fontSize:"13px", letterSpacing:".15em", color:"#C8A870", marginBottom:"8px" }}>TERMS</p>
                <p className="panel-subtitle" style={{ fontSize:"12px", color:"#C8A458", fontWeight:300 }}>Terms & Conditions</p>
              </div>
            </button>
          </div>

          {/* Accordion: ABOUT */}
          {expandedPanel === "about" && (
            <div style={{ borderBottom:"1px solid #141414", padding:"48px 40px" }}>
              <div style={{ maxWidth:"680px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"24px" }}>
                <p style={{ fontSize:"15px", lineHeight:1.9, color:"#D8D5CE" }}>
                  Profess is a communication coach built around perspective. Practice difficult conversations with audiences that challenge your assumptions, question your reasoning, and reveal blind spots in your communication. The goal isn't to predict people. It's to help you see what you might have missed before the real conversation begins.
                </p>
                <p style={{ fontSize:"15px", lineHeight:1.9, color:"#7A7570" }}>
                  Profess was built by Jethro Amaga as a communication training tool for anyone who wants to grow — not just perform.
                </p>
              </div>
            </div>
          )}

          {/* Accordion: TERMS */}
          {expandedPanel === "terms" && (
            <div style={{ borderBottom:"1px solid #141414", padding:"48px 40px" }}>
              <div style={{ maxWidth:"680px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"0" }}>
                {TERMS_SECTIONS.map((item,i) => (
                  <div key={i} style={{ paddingBottom:"28px", marginBottom:"28px", borderBottom: i < TERMS_SECTIONS.length-1 ? "1px solid #0E0E0E" : "none" }}>
                    <p style={{ fontSize:"13px", fontWeight:500, color:"#C0BDB8", marginBottom:"8px", letterSpacing:".04em" }}>{item.title}</p>
                    <p style={{ fontSize:"13px", lineHeight:1.9, color:"#C8A458", fontWeight:300 }}>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding:"32px 40px", textAlign:"center" }}>
            <p style={{ fontSize:"11px", color:"#1E1E1E", letterSpacing:".08em" }}>Profess — <SquigglyText style={{ color:"#1E1E1E" }}>Every conversation has another side.</SquigglyText></p>
          </div>
        </div>
        </ScrollRevealSection>

      </div>
      {showPlayer && <MusicWidget activePlaylist={activePlaylist} setActivePlaylist={setActivePlaylist} onClose={() => setShowPlayer(false)}/>}
      </>
    );
  }

  // ── LANGUAGE SELECTION — full-screen split ─────────────────────────────────
  if (screen === "lang") return (
    <div className="screen-enter" style={{ ...BASE, display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>
      <div className="grain-layer"/>
      {/* Back to landing */}
      <div style={{ position:"fixed", top:"24px", right:"40px", zIndex:50 }}>
        <button onClick={() => setScreen("landing")} style={{ background:"none", border:"none", color:"#C8A458", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"5px", transition:"color .2s", padding:0, cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.color="#C8A458"} onMouseLeave={e=>e.currentTarget.style.color="#C8A458"}>
          <IconArrowLeft/> Landing
        </button>
      </div>
      {/* Step indicator overlay */}
      <div style={{ position:"fixed", top:"24px", left:"50%", transform:"translateX(-50%)", zIndex:50 }}>
        <StepDots/>
      </div>
      {[
        { code:"en", label:"EN", name:"English", sub:"Session in English", accent:"#C8A870", side:"left" },
        { code:"id", label:"ID", name:"Indonesia", sub:"Sesi dalam Bahasa Indonesia", accent:"#C47A8A", side:"right" },
      ].map((opt, idx) => (
        <button key={opt.code}
          onClick={() => { playSfx("select"); setLang(opt.code); if(opt.code==="id") setSpeechEnabled(false); setScreen("mode"); }}
          style={{ flex:1, background:"#0E0D0B", border:"none", borderRight:idx===0?"1px solid #141414":"none", color:"#E9E5DC", fontFamily:"inherit", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", padding:"40px", transition:"background .3s, transform .2s ease-linear", overflow:"hidden", transformStyle:"preserve-3d", perspective:"1000px" }}
          onMouseEnter={e=>e.currentTarget.style.background="#0E0E0E"}
          onMouseMove={panelTiltMove}
              onTouchMove={panelTiltMove}
              onTouchEnd={panelTiltLeave}
          onMouseLeave={e=>{ e.currentTarget.style.background="#0E0D0B"; panelTiltLeave(e); }}>
          {/* Watermark letter */}
          <div style={{ position:"absolute", bottom:"-2vw", right:"-1vw", fontFamily:"'Playfair Display',serif", fontSize:"28vw", color:opt.accent, opacity:.025, lineHeight:1, userSelect:"none", pointerEvents:"none", fontStyle:"italic" }}>{opt.label}</div>
          {/* Bottom radial glow */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40%", background:`radial-gradient(ellipse at 50% 100%, ${opt.accent}0A 0%, transparent 70%)`, pointerEvents:"none" }}/>
          {/* Content */}
          <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"16px" }}>
            <p style={{ fontSize:"9px", letterSpacing:".15em", textTransform:"uppercase", color:"#C8A458", marginBottom:"8px" }}>{opt.label}</p>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(40px,5vw,64px)", fontWeight:400, color:opt.accent, lineHeight:1.1 }}>{opt.name}</h2>
            <p style={{ fontSize:"13px", color:"#C8A458", letterSpacing:".03em" }}>{opt.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // ── MODE SELECTION — full-screen split ─────────────────────────────────────
  if (screen === "mode") return (
    <div className="screen-enter" style={{ ...BASE, display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>
      <div className="grain-layer"/>
      {/* Back + steps */}
      <div style={{ position:"fixed", top:"24px", right:"40px", zIndex:50 }}>
        <button onClick={() => setScreen("lang")} style={{ background:"none", border:"none", color:"#C8A458", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"5px", transition:"color .2s", padding:0, cursor:"pointer" }}
          onMouseEnter={e=>e.currentTarget.style.color="#C8A458"} onMouseLeave={e=>e.currentTarget.style.color="#C8A458"}>
          <IconArrowLeft/> {lang==="id"?"Bahasa":"Language"}
        </button>
      </div>
      <div style={{ position:"fixed", top:"24px", left:"50%", transform:"translateX(-50%)", zIndex:50 }}><StepDots/></div>
      {[
        { key:"formal", label:"F", name:lang==="id"?"Formal":"Formal", accent:"#C8A870",
          desc:lang==="id"?"Wawancara, sidang skripsi, debat, pitching, negosiasi":"Job interviews, thesis defense, debate, pitch, negotiation" },
        { key:"social", label:"S", name:lang==="id"?"Sosial":"Social", accent:"#C2937A",
          desc:lang==="id"?"Reuni, kesan pertama, small talk, situasi canggung":"Reconnecting, first impressions, small talk, awkward situations" },
      ].map((opt, idx) => (
        <button key={opt.key}
          onClick={() => { playSfx("select"); setPendingMode(opt.key); setScreen("disclaimer"); }}
          style={{ flex:1, background:"#0E0D0B", border:"none", borderRight:idx===0?"1px solid #141414":"none", color:"#E9E5DC", fontFamily:"inherit", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", padding:"40px", transition:"background .3s, transform .2s ease-linear", overflow:"hidden", transformStyle:"preserve-3d", perspective:"1000px" }}
          onMouseEnter={e=>e.currentTarget.style.background="#0E0E0E"}
          onMouseMove={panelTiltMove}
              onTouchMove={panelTiltMove}
              onTouchEnd={panelTiltLeave}
          onMouseLeave={e=>{ e.currentTarget.style.background="#0E0D0B"; panelTiltLeave(e); }}>
          <div style={{ position:"absolute", bottom:"-4vw", right:"-2vw", fontFamily:"'Playfair Display',serif", fontSize:"30vw", color:opt.accent, opacity:.03, lineHeight:1, userSelect:"none", pointerEvents:"none", fontStyle:"italic" }}>{opt.label}</div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40%", background:`radial-gradient(ellipse at 50% 100%, ${opt.accent}08 0%, transparent 70%)`, pointerEvents:"none" }}/>
          <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"16px", maxWidth:"320px" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(36px,4.5vw,56px)", fontWeight:400, color:opt.accent, lineHeight:1.1 }}>{opt.name}</h2>
            <p style={{ fontSize:"13px", color:"#C8A458", lineHeight:1.7, textAlign:"center", letterSpacing:".03em" }}>{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // ── DISCLAIMER ─────────────────────────────────────────────────────────────
  if (screen === "disclaimer") {
    const isFormal = pendingMode === "formal";
    const isID = lang === "id";
    const accent = isFormal ? "#C8A870" : "#C2937A";
    const disclaimerContent = {
      en: {
        formal:  { title:"Before we begin", body:["Profess is a communication training tool, not a qualified professional.","The characters in this session — interviewers, examiners, judges, journalists — are simulations. Their responses do not represent the actual standards, procedures, or judgments of any real institution, profession, or individual.","Feedback provided by Profess is for practice purposes only. It cannot replace the assessment of a real interviewer, academic examiner, legal authority, or any other professional. Profess may make errors in reasoning, miss important nuances, or reflect biases in its training.","Do not use Profess as a basis for actual professional decisions."], cta:"I understand — begin session" },
        social:  { title:"Before we begin", body:["Profess is a communication training tool, not a social scientist or therapist.","The characters and scenarios in this session are simplified simulations for training purposes. They do not accurately represent any real person, cultural group, or social dynamic.","Profess may make errors, oversimplify complex interpersonal situations, or reflect cultural biases. Real human interactions are far more nuanced than any simulation can capture.","Use this session as a starting point for reflection — not as a definitive guide to how people think or behave."], cta:"I understand — begin session" },
      },
      id: {
        formal:  { title:"Sebelum kita mulai", body:["Profess adalah alat latihan komunikasi, bukan profesional yang berkualifikasi.","Karakter dalam sesi ini — pewawancara, penguji, hakim, jurnalis — adalah simulasi. Respons mereka tidak mencerminkan standar, prosedur, atau penilaian aktual dari institusi, profesi, atau individu nyata manapun.","Feedback dari Profess hanya untuk tujuan latihan. Profess tidak dapat menggantikan penilaian pewawancara sungguhan, penguji akademik, otoritas hukum, atau profesional lainnya. Profess dapat melakukan kesalahan dalam penalaran, melewatkan nuansa penting, atau mencerminkan bias dalam pelatihannya.","Jangan gunakan Profess sebagai dasar keputusan profesional yang sesungguhnya."], cta:"Saya mengerti — mulai sesi" },
        social:  { title:"Sebelum kita mulai", body:["Profess adalah alat latihan komunikasi, bukan ilmuwan sosial atau terapis.","Karakter dan skenario dalam sesi ini adalah simulasi yang disederhanakan untuk tujuan latihan. Mereka tidak secara akurat mencerminkan individu nyata, kelompok budaya, atau dinamika sosial manapun.","Profess dapat melakukan kesalahan, menyederhanakan situasi interpersonal yang kompleks, atau mencerminkan bias budaya. Interaksi manusia yang sesungguhnya jauh lebih bernuansa dari yang dapat ditangkap simulasi manapun.","Gunakan sesi ini sebagai titik awal refleksi — bukan sebagai panduan definitif tentang cara orang berpikir atau berperilaku."], cta:"Saya mengerti — mulai sesi" },
      }
    };
    const dc = disclaimerContent[isID?"id":"en"][isFormal?"formal":"social"];
    return (
      <div className="screen-enter" style={{ ...BASE, display:"flex", flexDirection:"column" }}>
        <style>{css}</style>
        <div className="grain-layer"/>
        <div style={{ position:"relative", zIndex:1, padding:"0 40px", height:"56px", borderBottom:"1px solid #141414", display:"flex", alignItems:"center", gap:"12px" }}>
          <Wordmark/>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"20px" }}>
            <StepDots/>
            <button onClick={() => setScreen("mode")} style={{ background:"none", border:"none", color:"#C8A458", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"5px", transition:"color .2s", padding:0, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.color="#C8A458"} onMouseLeave={e=>e.currentTarget.style.color="#C8A458"}>
              <IconArrowLeft/> {isID?"Kembali":"Back"}
            </button>
          </div>
        </div>
        <div style={{ position:"relative", zIndex:1, flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 24px" }}>
          <div style={{ maxWidth:"560px", width:"100%" }}>
            <div style={{ marginBottom:"40px" }}>
              <p style={{ fontSize:"9px", letterSpacing:".15em", textTransform:"uppercase", color:"#C8A458", marginBottom:"12px" }}>{isFormal?(isID?"Formal":"Formal"):(isID?"Sosial":"Social")}</p>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"32px", fontWeight:400, color:"#D8D5CE", lineHeight:1.2 }}>{dc.title}</h2>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px", marginBottom:"48px" }}>
              <p style={{ fontSize:"16px", lineHeight:1.85, color:"#D8D5CE" }}>{dc.body[0]}</p>
              {dc.body.slice(1).map((para,i) => (
                <p key={i} style={{ fontSize:"13px", lineHeight:1.9, color:"#C8A458", letterSpacing:".03em" }}>{para}</p>
              ))}
            </div>
            <button onClick={() => setScreen("intensity")}
              style={{ width:"100%", height:"48px", background:"none", border:`1px solid ${accent}`, color:accent, fontFamily:"inherit", fontSize:"11px", letterSpacing:".12em", textTransform:"uppercase", transition:"background .2s, color .2s", cursor:"pointer" }}
              onMouseEnter={e=>{ e.currentTarget.style.background=accent; e.currentTarget.style.color="#0E0D0B"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=accent; }}>
              {dc.cta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── INTENSITY ──────────────────────────────────────────────────────────────
  if (screen === "intensity") {
    const isID = lang === "id";
    const isFormal = pendingMode === "formal";
    const levels = isID ? [
      { key:"comfortable", bars:1, color:"#7A9A70", label:"Nyaman",      desc:"Supportif dan membangun — cocok untuk pemula atau mencoba skenario baru" },
      { key:"challenging", bars:2, color:"#C8A870", label:"Menantang",   desc:"Ketat dan jujur — standar tinggi, feedback langsung tanpa basa-basi" },
      { key:"no_mercy",   bars:3, color:"#BC5A5A", label:"Tanpa Ampun", desc:"Tekanan maksimal — untuk yang ingin diuji habis-habisan" },
    ] : [
      { key:"comfortable", bars:1, color:"#7A9A70", label:"Comfortable", desc:"Supportive and constructive — good for trying new scenarios or warming up" },
      { key:"challenging", bars:2, color:"#C8A870", label:"Challenging",  desc:"Rigorous and honest — high standards, direct feedback, no softening" },
      { key:"no_mercy",   bars:3, color:"#BC5A5A", label:"No Mercy",     desc:"Maximum pressure — for when you want to be pushed to your absolute limit" },
    ];
    const Bars = ({ count, color, hovered }) => (
      <div style={{ display:"flex", gap:"4px", alignItems:"flex-end", flexShrink:0, width:"28px", transition:"transform .2s", transform:hovered?"scale(1.1)":"scale(1)" }}>
        {[1,2,3].map(i => <div key={i} style={{ width:"5px", height:`${8+i*6}px`, background:i<=count?color:"#1E1E1E", borderRadius:"1px", transition:"background .2s" }}/>)}
      </div>
    );
    return (
      <>
      <div className="screen-enter" style={{ ...BASE, display:"flex", flexDirection:"column" }}>
        <style>{css}</style>
        <div className="grain-layer"/>
        <div style={{ position:"relative", zIndex:1, padding:"0 40px", height:"56px", borderBottom:"1px solid #141414", display:"flex", alignItems:"center" }}>
          <Wordmark/>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"20px" }}>
            <StepDots/>
            <button onClick={() => setScreen("disclaimer")} style={{ background:"none", border:"none", color:"#C8A458", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"5px", transition:"color .2s", padding:0, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.color="#C8A458"} onMouseLeave={e=>e.currentTarget.style.color="#C8A458"}>
              <IconArrowLeft/> {isID?"Kembali":"Back"}
            </button>
          </div>
        </div>
        <div style={{ position:"relative", zIndex:1, flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
          <div style={{ width:"100%", maxWidth:"480px" }}>
            <div style={{ marginBottom:"40px" }}>
              <p style={{ fontSize:"9px", letterSpacing:".15em", textTransform:"uppercase", color:"#C8A458", marginBottom:"12px" }}>{isID?"Intensitas":"Intensity"}</p>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"28px", fontWeight:400, color:"#D8D5CE" }}>{isID?"Seberapa keras Profess mendorongmu":"How hard should Profess push you"}</h2>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0", border:"1px solid #141414" }}>
              {levels.map((lvl, idx) => (
                <button key={lvl.key}
                  onClick={() => { playSfx("select"); setIntensity(lvl.key); setScreen("scenario"); }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=`${lvl.color}0A`; e.currentTarget.querySelector('.lvl-border').style.opacity="1"; e.currentTarget.querySelector('.lvl-bars').style.transform="scale(1.1)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background="#0E0D0B"; e.currentTarget.querySelector('.lvl-border').style.opacity="0"; e.currentTarget.querySelector('.lvl-bars').style.transform="scale(1)"; }}
                  style={{ background:"#0E0D0B", border:"none", borderBottom:idx<levels.length-1?"1px solid #141414":"none", color:"#E9E5DC", fontFamily:"inherit", padding:"0 24px", minHeight:"120px", cursor:"pointer", textAlign:"left", display:"flex", gap:"24px", alignItems:"center", position:"relative", overflow:"hidden", transition:"background .2s" }}>
                  <div className="lvl-border" style={{ position:"absolute", left:0, top:0, bottom:0, width:"2px", background:lvl.color, opacity:0, transition:"opacity .2s" }}/>
                  <div className="lvl-bars" style={{ display:"flex", gap:"4px", alignItems:"flex-end", flexShrink:0, width:"28px", transition:"transform .2s", transformOrigin:"bottom center" }}>
                    {[1,2,3].map(i => <div key={i} style={{ width:"5px", height:`${8+i*6}px`, background:i<=lvl.bars?lvl.color:"#1E1E1E", borderRadius:"1px" }}/>)}
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"20px", color:lvl.color, marginBottom:"8px" }}>{lvl.label}</div>
                    <div style={{ fontSize:"13px", color:"#C8A458", lineHeight:1.7, maxWidth:"320px", letterSpacing:".03em" }}>{lvl.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showPlayer && <MusicWidget activePlaylist={activePlaylist} setActivePlaylist={setActivePlaylist} onClose={() => setShowPlayer(false)}/>}
      </>
    );
  }

  // ── SCENARIO PICKER ────────────────────────────────────────────────────────
  if (screen === "scenario") {
    const isID = lang === "id";
    const isFormal = pendingMode === "formal";
    const accent = isFormal ? "#C8A870" : "#C2937A";
    const SCENARIOS = {
      formal: {
        id: [
          { group:"Akademik", items:["Sidang Skripsi — Penguji yang Skeptis","Presentasi Seminar — Dosen yang Tidak Yakin","Debat Parlemen Asia — Mosi Kontroversial","Ospek Organisasi — Senior yang Menguji Mental"] },
          { group:"Karir", items:["Interview Kerja Pertama — HRD yang Kritis","Pitching Startup ke Investor — 5 Menit untuk Meyakinkan","Negosiasi Gaji — Atasan yang Tidak Mudah","Press Conference — Jurnalis yang Agresif","Rapat dengan Klien — Keputusan di Tangan Mereka"] },
          { group:"Hukum & Publik", items:["Persidangan Mock Trial — Jaksa yang Tidak Memberi Celah","Debat Publik — Lawan yang Lebih Berpengalaman","Audiensi dengan Pejabat — Birokrasi yang Tidak Berpihak"] },
        ],
        en: [
          { group:"Academic", items:["Thesis Defense — The Skeptical Examiner","Seminar Presentation — The Unconvinced Professor","Asian Parliamentary Debate — A Controversial Motion","Org Initiation — Senior Testing Your Limits"] },
          { group:"Career", items:["First Job Interview — The Critical HRD","Startup Pitch — 5 Minutes to Convince an Investor","Salary Negotiation — A Manager Who Won't Budge","Press Conference — An Aggressive Journalist","Client Meeting — The Decision Is Theirs"] },
          { group:"Legal & Public", items:["Mock Trial — A Prosecutor With No Mercy","Public Debate — An Opponent More Experienced Than You","Government Audience — Bureaucracy That Isn't On Your Side"] },
        ],
      },
      social: {
        id: [
          { group:"Relasi", items:["Reuni Teman Lama — Ada yang Belum Selesai","Ketemu Crush — Kesempatan yang Tidak Bisa Diulang","Kenalan Baru di Acara — Tidak Ada yang Dikenal","Minta Maaf ke Teman — Sudah Terlalu Lama Didiamkan","Konfrontasi Teman — Sebelum Hubungan Ini Berakhir"] },
          { group:"Keluarga", items:["Bicara Jujur ke Orang Tua — Tentang Masa Depan","Ketemu Calon Mertua — Pertama Kali","Adik yang Tidak Mau Diatur — Tapi Kamu Peduli"] },
          { group:"Profesional Casual", items:["Ngobrol dengan Senior di Kantor — Yang Kamu Kagumi","Mengkritik Atasan dengan Sopan — Tanpa Kehilangan Posisi","Networking di Acara — Mulai dari Nol"] },
          { group:"Situasional", items:["Kenalan di Bookstore — Buku yang Sama","Perjalanan Panjang — Teman Duduk yang Menarik","Golf dengan Pengusaha Senior — Empat Jam untuk Berkesan"] },
        ],
        en: [
          { group:"Relationships", items:["Reconnecting with an Old Friend — Something Was Left Unsaid","Meeting Your Crush — A Chance You Can't Repeat","New People at an Event — You Don't Know Anyone","Apologizing to a Friend — You've Waited Too Long","Confronting a Friend — Before This Ends"] },
          { group:"Family", items:["Honest Talk with Parents — About Your Future","Meeting the Parents — First Time","A Sibling Who Won't Listen — But You Care"] },
          { group:"Professional Casual", items:["Talking to a Senior You Admire — At the Office","Giving Feedback to Your Boss — Without Losing Ground","Networking at an Event — Starting From Zero"] },
          { group:"Situational", items:["Bookstore Encounter — The Same Book","Long Journey — An Interesting Seatmate","Golf with a Senior Executive — Four Hours to Make an Impression"] },
        ],
      },
    };
    const groups = SCENARIOS[pendingMode]?.[isID?"id":"en"] || [];
    return (
      <div className="screen-enter" style={{ ...BASE, display:"flex", flexDirection:"column" }}>
        <style>{css}</style>
        <div className="grain-layer"/>
        <div style={{ position:"relative", zIndex:1, padding:"0 40px", height:"56px", borderBottom:"1px solid #141414", display:"flex", alignItems:"center", flexShrink:0 }}>
          <Wordmark/>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"20px" }}>
            <StepDots/>
            <button onClick={() => setScreen("intensity")} style={{ background:"none", border:"none", color:"#C8A458", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"5px", transition:"color .2s", padding:0, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.color="#C8A458"} onMouseLeave={e=>e.currentTarget.style.color="#C8A458"}>
              <IconArrowLeft/> {isID?"Kembali":"Back"}
            </button>
          </div>
        </div>
        <div style={{ position:"relative", zIndex:1, flex:1, overflowY:"auto", padding:"40px" }}>
          <div style={{ maxWidth:"600px", margin:"0 auto" }}>
            <div style={{ marginBottom:"40px" }}>
              <p style={{ fontFamily:"'Playfair Display',serif", fontSize:"28px", fontWeight:400, color:"#D8D5CE", marginBottom:"8px" }}>
                {isID?"Pilih skenario":"Choose a scenario"}
              </p>
              <p style={{ fontSize:"13px", color:"#C8A458", letterSpacing:".03em" }}>
                {isID?"Profess akan bertanya nama dan detail sebelum dimulai":"Profess will ask your name and details before we begin"}
              </p>
            </div>

            {/* Free start */}
            <div style={{ marginBottom:"48px" }}>
              <button onClick={() => { playSfx("select"); setScenario(null); startSession(pendingMode, null); }}
                style={{ width:"100%", background:"none", border:`1px solid ${accent}25`, color:accent, fontFamily:"inherit", fontSize:"13px", padding:"20px 24px", textAlign:"left", letterSpacing:".04em", transition:"border-color .2s, background .2s", cursor:"pointer" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=accent; e.currentTarget.style.background=`${accent}08`; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=`${accent}25`; e.currentTarget.style.background="none"; }}>
                + {isID?"Mulai bebas — saya punya skenario sendiri":"Start free — I have my own scenario"}
              </button>
            </div>

            {/* Scenario groups */}
            <div style={{ display:"flex", flexDirection:"column", gap:"40px" }}>
              {groups.map((group, gi) => (
                <div key={gi}>
                  <p style={{ fontSize:"9px", color:"#C8A458", letterSpacing:".15em", textTransform:"uppercase", marginBottom:"16px", paddingBottom:"8px", borderBottom:"1px solid #141414" }}>
                    {group.group}
                  </p>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    {group.items.map((item, ii) => (
                      <button key={ii}
                        onClick={() => { playSfx("select"); setScenario(item); startSession(pendingMode, item); }}
                        style={{ background:"none", border:"none", borderBottom:"1px solid #0E0E0E", color:"#8A8580", fontFamily:"inherit", fontSize:"14px", fontWeight:300, padding:"14px 0", textAlign:"left", lineHeight:1.5, transition:"color .15s, padding-left .2s, border-left .2s, background .2s", borderLeft:"0px solid transparent", position:"relative", cursor:"pointer" }}
                        onMouseEnter={e=>{ e.currentTarget.style.color="#E9E5DC"; e.currentTarget.style.paddingLeft="8px"; e.currentTarget.style.borderLeft=`2px solid ${accent}`; e.currentTarget.style.background=`${accent}07`; }}
                        onMouseLeave={e=>{ e.currentTarget.style.color="#8A8580"; e.currentTarget.style.paddingLeft="0"; e.currentTarget.style.borderLeft="0px solid transparent"; e.currentTarget.style.background="none"; }}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height:"48px" }}/>
          </div>
        </div>
      </div>
    );
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  if (screen === "summary") {
    const isID = lang === "id";
    const isFormal = sessionMode === "formal";
    const accent = isFormal ? "#C8A870" : "#C2937A";
    const summaryLines = summary ? summary.split('\n').filter(l => l.trim()) : [];
    return (
      <div className="screen-enter" style={{ ...BASE, display:"flex", flexDirection:"column" }}>
        <style>{css}</style>
        <div style={{ padding:"0 40px", height:"56px", borderBottom:"1px solid #141414", display:"flex", alignItems:"center" }}>
          <SquigglyText style={{ fontFamily:"'Playfair Display',serif", fontSize:"17px", fontWeight:500, letterSpacing:".06em" }}>Profess</SquigglyText>
        </div>
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 24px" }}>
          <div style={{ maxWidth:"520px", width:"100%" }}>
            <p style={{ fontSize:"9px", letterSpacing:".15em", textTransform:"uppercase", color:"#C8A458", marginBottom:"12px" }}>
              {isID?"Ringkasan Sesi":"Session Complete"}
            </p>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"32px", fontWeight:400, color:accent, marginBottom:"40px", lineHeight:1.2 }}>
              {isID?"Kamu sudah selesai.":"You showed up."}
            </h2>
            <div style={{ borderTop:"1px solid #141414", marginBottom:"40px" }}>
              {summaryLines.map((line, i) => {
                const clean = line.replace(/^[-•]\s*/, "").trim();
                if (!clean) return null;
                return (
                  <div key={i} style={{ display:"flex", gap:"20px", padding:"20px 0", borderBottom:"1px solid #0E0E0E", alignItems:"flex-start" }}>
                    <div style={{ width:"1px", background:accent, opacity:.35, flexShrink:0, alignSelf:"stretch", minHeight:"16px" }}/>
                    <p style={{ fontSize:"14px", lineHeight:1.85, color:"#9A9590" }}>{clean}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:"12px" }}>
              <button onClick={() => { setSummary(null); setScreen("session"); }}
                style={{ background:"none", border:`1px solid ${accent}`, color:accent, fontFamily:"inherit", fontSize:"10px", padding:"10px 24px", letterSpacing:".12em", textTransform:"uppercase", transition:"background .2s, color .2s", cursor:"pointer" }}
                onMouseEnter={e=>{ e.currentTarget.style.background=accent; e.currentTarget.style.color="#0E0D0B"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=accent; }}>
                {isID?"Lanjut sesi":"Continue session"}
              </button>
              <button onClick={resetSession}
                style={{ background:"none", border:"1px solid #1E1E1E", color:"#C8A458", fontFamily:"inherit", fontSize:"10px", padding:"10px 24px", letterSpacing:".12em", textTransform:"uppercase", transition:"border-color .2s, color .2s", cursor:"pointer" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="#C8A458"; e.currentTarget.style.color="#8A8580"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1E1E1E"; e.currentTarget.style.color="#C8A458"; }}>
                {isID?"Sesi baru":"New session"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SESSION ────────────────────────────────────────────────────────────────
  const isFormalSession = sessionMode === "formal";
  const sessionAccent = isFormalSession ? "#C8A870" : "#C2937A";

  const charAnimBlock = (size, heightOverride, marginTop) => {
    const isLarge = parseInt(size, 10) > 100;
    const effectiveMood = agitated.session ? "uncomfortable" : currentMood;
    const idleAnim = { default:"coachNod 4s ease-in-out infinite", journalist:"journalistSway 3s ease-in-out infinite", critic:"journalistSway 3s ease-in-out infinite", judge:"judgeTap 5s ease-in-out infinite", cross_examiner:"judgeTap 4.5s ease-in-out infinite", prosecutor:"judgeTap 4.5s ease-in-out infinite", friend_female:"friendBob 2.8s ease-in-out infinite", best_friend:"friendBob 2.6s ease-in-out infinite", crush:"friendBob 3s ease-in-out infinite", romantic_interest:"friendBob 3s ease-in-out infinite", date:"friendBob 2.8s ease-in-out infinite", blind_date:"friendBob 3.2s ease-in-out infinite", friend_male:"friendBob 3.2s ease-in-out infinite", negotiator:"negotiatorLean 4s ease-in-out infinite", ceo:"negotiatorLean 4.5s ease-in-out infinite", executive:"negotiatorLean 4.5s ease-in-out infinite", diplomat:"negotiatorLean 5s ease-in-out infinite", acquirer:"negotiatorLean 4s ease-in-out infinite", board_member:"negotiatorLean 5s ease-in-out infinite" }[displayRole] || "idleBreathe 3.5s ease-in-out infinite";
    const moodAnim = isTalking ? null : { surprised:"moodSurprised .6s ease forwards", amused:"moodAmused 1.5s ease-in-out infinite", skeptical:"moodSkeptical 2s ease-in-out infinite", serious:"moodSerious 3s ease-in-out infinite", thinking:"moodThinking 2.5s ease-in-out infinite", warm:"moodWarm 2s ease-in-out infinite", uncomfortable:"moodUncomf .5s ease forwards" }[effectiveMood];
    const talkAnim = isTalking && isSpeaking ? "talkBody .4s ease-in-out infinite" : null;
    const AURA_COLORS = { warm:"#C8A870", amused:"#C8A870", surprised:"#A8B8D0", thinking:"#7A8AA0", skeptical:"#8A7A60", serious:"#4A4040", uncomfortable:"#8A6060" };
    const moodColor = AURA_COLORS[effectiveMood];
    const w = size; const h = heightOverride || (isLarge ? "354px" : "72px");
    const charEl = <div key={displayRole+currentMood} className="char-enter"
      onMouseMove={bodyTiltMove("session")} onMouseLeave={bodyTiltLeave("session")}
      onTouchMove={bodyTiltMove("session")} onTouchEnd={bodyTiltLeave("session")}
      style={{ width:"100%", height:"100%", opacity:isTransitioning?0:1, transition:"opacity .38s, transform .2s ease-linear", transformStyle:"preserve-3d", position:"relative", zIndex:1 }}>
      <MagneticBox strength={0.2} maxDistance={16} style={{ width:"100%", height:"100%" }}>
        <div style={{ width:"100%", height:"100%", animation:talkAnim||moodAnim||idleAnim, filter:isSpeaking?`drop-shadow(0 0 ${isLarge?"18px":"8px"} ${charMeta.accent}40)`:"none" }} dangerouslySetInnerHTML={{ __html:charSVG }}/>
      </MagneticBox>
    </div>;
    if (!moodColor) return (
      <div style={{ position:"relative", width:w, height:h, perspective:"900px", marginTop:marginTop||0 }}>
        <Spotlight fill={charMeta.accent} style={{ left:"50%", top:"0", transform:"translate(-50%,-30%)", zIndex:0 }}/>
        {charEl}
      </div>
    );
    const rays = [0,45,90,135,180,225,270,315].map((angle,ri) => (
      <div key={ri} style={{ position:"absolute", width:"3px", height:"35%", top:"15%", left:"calc(50% - 1.5px)", transformOrigin:"bottom center", "--ray-angle":`${angle}deg`, transform:"rotate(var(--ray-angle))", background:`linear-gradient(to top, ${moodColor}40, transparent)`, borderRadius:"2px 2px 0 0", animation:`auraRay ${2.5+ri*0.3}s ease-in-out infinite`, pointerEvents:"none", zIndex:2 }}/>
    ));
    return (
      <div style={{ position:"relative", width:w, height:h, perspective:"900px", marginTop:marginTop||0 }}>
        <Spotlight fill={moodColor} style={{ left:"50%", top:"0", transform:"translate(-50%,-30%)", zIndex:0 }}/>
        <div style={{ position:"absolute", width:"140%", height:"140%", top:"-20%", left:"-20%", borderRadius:"50%", background:`radial-gradient(ellipse at center, ${moodColor}28 0%, ${moodColor}10 40%, transparent 70%)`, animation:"auraBreath 3s ease-in-out infinite", "--aura-base":"0.6", pointerEvents:"none", zIndex:0, transition:"all 0.8s ease" }}/>
        {rays}
        {charEl}
      </div>
    );
  };

  const msgList = (fontSize="15px") => messages.map((msg,i) => {
    const isA = msg.role==="assistant";
    const mInRole = isA && msg.inRole;
    const mc = isA
      ? (mInRole ? (charCache[currentRole]||CHARS.default) : (currentRole!=="default"?(charCache[currentRole]||CHARS.default):CHARS.default))
      : CHARS.default;
    const segments = isA ? parseSegments(msg.content) : null;
    const innerText = msg.inner ? msg.inner.replace(/\*/g,"").replace(/_/g,"").trim() : null;
    return (
      <div key={i} className="msg-enter" style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        <span style={{ fontSize:"9px", letterSpacing:".12em", textTransform:"uppercase", fontWeight:500, color:isA?(mInRole?mc.accent:"#C8A458"):"#2A2A2A" }}>
          {isA?(mInRole?mc.name:"Profess"):"You"}
        </span>
        {isA && segments ? (
          <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
            {segments.map((seg,si) => {
              if (seg.type==="stage") return (
                <p key={si} style={{ fontSize:"12px", fontStyle:"italic", color:"#3A3835", lineHeight:1.75, margin:"4px 0" }}>{seg.text}</p>
              );
              if (seg.type==="section_break") return (
                <div key={si} style={{ display:"flex", alignItems:"center", gap:"14px", margin:"14px 0 8px" }}>
                  <div style={{ flex:1, height:"1px", background:"#141414" }}/>
                  <span style={{ fontSize:"9px", letterSpacing:".12em", textTransform:"uppercase", color:"#2A2520" }}>coach</span>
                  <div style={{ flex:1, height:"1px", background:"#141414" }}/>
                </div>
              );
              if (seg.type==="coaching") return (
                <p key={si} style={{ fontSize:"13px", lineHeight:2, color:"6A6560", whiteSpace:"pre-wrap", fontStyle:"italic", paddingLeft:"16px" }}>
                  {renderMarkdown(seg.text)}
                </p>
              );
              return (
                <p key={si} style={{ fontSize, lineHeight:1.9, color:mInRole?"#E8E5DE":"#B0ADA8", whiteSpace:"pre-wrap", borderLeft:mInRole?`2px solid ${mc.accent}28`:"none", paddingLeft:mInRole?"14px":"0" }}>
                  {renderMarkdown(seg.text)}
                </p>
              );
            })}
          </div>
        ) : <p style={{ fontSize, lineHeight:1.9, color:"#6A6760", whiteSpace:"pre-wrap" }}>{renderMarkdown(msg.content)}</p>}
        {isA && innerText && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"4px" }}>
            <div style={{ width:"1px", height:"14px", background:mc.accent, opacity:.3, flexShrink:0 }}/>
            <p style={{ fontSize:"11px", fontStyle:"italic", color:mc.accent, opacity:.45, letterSpacing:".02em" }}>{innerText}</p>
          </div>
        )}
      </div>
    );
  });

  const intensityMeta = () => {
    if (!intensity) return null;
    const map = { comfortable:{color:"#7A9A70",label:lang==="id"?"Nyaman":"Comfortable",bars:1}, challenging:{color:"#C8A870",label:lang==="id"?"Menantang":"Challenging",bars:2}, no_mercy:{color:"#BC5A5A",label:lang==="id"?"Tanpa Ampun":"No Mercy",bars:3} }[intensity];
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
        {[1,2,3].map(i => <div key={i} style={{ width:"2px", height:`${5+i*3}px`, background:i<=map.bars?map.color:"#1E1E1E", borderRadius:"1px" }}/>)}
        <span style={{ fontSize:"9px", letterSpacing:".1em", color:map.color, textTransform:"uppercase", marginLeft:"2px" }}>{map.label}</span>
      </div>
    );
  };

  const inputControls = (inputFs="15px", inputPad="12px 14px", btnSz="52px") => (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      {micError && <p style={{ fontSize:"10px", color:"#BC5A5A", textAlign:"center" }}>{micError}</p>}
      <div style={{ display:"flex", gap:"8px", alignItems:"flex-end" }}>
        <textarea ref={textareaRef}
          style={{ flex:1, background:"#0A0A0A", border:`1px solid ${isListening?"#7A4040":"#1A1A1A"}`, color:"#E9E5DC", fontFamily:"inherit", fontSize:inputFs, fontWeight:300, lineHeight:1.7, padding:inputPad, resize:"none", outline:"none", minHeight:btnSz, maxHeight:"150px", overflowY:"auto", transition:"border-color .2s" }}
          placeholder={isListening?(lang==="id"?"Mendengarkan...":"Listening..."):(lang==="id"?"Ketik sesuatu...":"Say something...")}
          value={input} onChange={handleTA} onKeyDown={handleKeyDown} rows={1}
          onFocus={e=>{ if(!isListening) e.target.style.borderColor="#242424"; }}
          onBlur={e=>{ if(!isListening) e.target.style.borderColor="#1A1A1A"; }}/>
        {isSpeaking && (
          <button onClick={stopSpeech} style={{ background:"#0E0808", border:"1px solid #4A2828", color:"#7A4848", width:btnSz, height:btnSz, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"border-color .2s, color .2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#7A4848"; e.currentTarget.style.color="#BC7A7A"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor="#4A2828"; e.currentTarget.style.color="#7A4848"; }}>
            <IconStop/>
          </button>
        )}
        <div style={{ display:"flex", flexWrap:isMobile?"wrap":"nowrap", border:"1px solid #1A1A1A", width:isMobile?`calc(${btnSz} * 2 + 2px)`:"auto", height:isMobile?`calc(${btnSz} * 2 + 2px)`:btnSz, flexShrink:0, boxSizing:"border-box" }}>
          <button onClick={askCoach} disabled={loading} title={lang==="id"?"Tanya Pelatih":"Ask Coach"}
            style={{ background:"none", border:"none", borderRight:"1px solid #1A1A1A", borderBottom:isMobile?"1px solid #1A1A1A":"none", color:"#C8A458", width:btnSz, height:btnSz, boxSizing:"border-box", padding:0, margin:0, display:"flex", alignItems:"center", justifyContent:"center", cursor:loading?"default":"pointer", opacity:loading?0.4:1, transition:"background .2s, color .2s" }}
            onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.background="#1A1612"; e.currentTarget.style.color="#C8A870"; } }}
            onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color="#C8A458"; }}>
            <IconCoach/>
          </button>
          <button onClick={toggleMic} className={isListening?"mic-active":""}
            style={{ background:isListening?"#180C0C":"none", border:"none", borderRight:isMobile?"none":"1px solid #1A1A1A", borderBottom:isMobile?"1px solid #1A1A1A":"none", color:isListening?"#BC7A7A":"#C8A458", width:btnSz, height:btnSz, boxSizing:"border-box", padding:0, margin:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}
            onMouseEnter={e=>{ if(!isListening){e.currentTarget.style.background="#1A1612";e.currentTarget.style.color="#C8A458";} }}
            onMouseLeave={e=>{ if(!isListening){e.currentTarget.style.background="none";e.currentTarget.style.color="#C8A458";} }}>
            {isListening ? <IconStop/> : <IconMic/>}
          </button>
          <button id="psend" onClick={sendMessage} disabled={loading||!input.trim()}
            style={{ background:"none", border:"none", borderRight:"1px solid #1A1A1A", color:input.trim()&&!loading?sessionAccent:"#2A2A2A", width:btnSz, height:btnSz, boxSizing:"border-box", padding:0, margin:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", opacity:loading||!input.trim()?0.3:1 }}
            onMouseEnter={e=>{ if(input.trim()&&!loading){e.currentTarget.style.background=sessionAccent;e.currentTarget.style.color="#0E0D0B";} }}
            onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color=input.trim()&&!loading?sessionAccent:"#2A2A2A"; }}>
            <IconSend/>
          </button>
          <button onClick={endSession} title={lang==="id"?"Akhiri sesi":"End session"}
            style={{ background:"none", border:"none", borderRight:isMobile?"none":"none", color:"#C8A458", width:btnSz, height:btnSz, boxSizing:"border-box", padding:0, margin:0, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"background .2s, color .2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="#1A1612"; e.currentTarget.style.color="#C8A870"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color="#C8A458"; }}>
            <IconEnd/>
          </button>
        </div>
      </div>
      {isListening && (
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ display:"flex", gap:"2px", alignItems:"flex-end" }}>
            {[0,.08,.16,.24,.32].map((d,i)=><div key={i} style={{ width:"2px", height:`${5+i*3}px`, background:"#7A4040", borderRadius:"1px", animation:`waveBar .5s ease-in-out ${d}s infinite` }}/>)}
          </div>
          <span style={{ fontSize:"9px", color:"#5A3030", letterSpacing:".1em", textTransform:"uppercase" }}>
            {lang==="id"?"Merekam — jeda untuk kirim":"Recording — pause to send"}
          </span>
        </div>
      )}
    </div>
  );

  const actionRow = (compact=false) => (
    <div style={{ display:"flex", gap:"16px", alignItems:"center", marginBottom:compact?"6px":"8px" }}>
      {lastExchange && (
        <button onClick={tryAgain} style={{ background:"none", border:"none", color:`${sessionAccent}60`, fontFamily:"inherit", fontSize:"10px", letterSpacing:".08em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:"5px", transition:"color .2s", padding:0 }}
          onMouseEnter={e=>e.currentTarget.style.color=sessionAccent}
          onMouseLeave={e=>e.currentTarget.style.color=`${sessionAccent}60`}>
          <IconRefresh/> {lang==="id"?"Coba lagi":"Try again"}
        </button>
      )}
    </div>
  );

  const loadingDots = () => {
    const coachSVG = buildSVG(CHARS.default, "thinking", false);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        <span style={{ fontSize:"9px", letterSpacing:".12em", textTransform:"uppercase", color:charMeta.accent }}>{isInRole?charMeta.name:"Profess"}</span>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"32px", height:"40px", animation:"moodThinking 2.5s ease-in-out infinite", flexShrink:0 }} dangerouslySetInnerHTML={{ __html:coachSVG }}/>
          <div style={{ display:"flex", gap:"6px" }}>
            {[0,.2,.4].map((d,i)=><div key={i} style={{ width:"4px", height:"4px", background:charMeta.accent, borderRadius:"50%", opacity:.25, animation:`pulse 1.1s ease-in-out ${d}s infinite` }}/>)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...BASE, display:"flex", flexDirection:"column" }}>
      <style>{css}</style>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:-1 }}><DottedGlowBackground/></div>

      {/* Session header */}
      <div style={{ padding:`0 ${isMobile?"16px":"32px"}`, height:isMobile?"48px":"56px", borderBottom:"1px solid #141414", display:"flex", alignItems:"center", gap:"16px", flexShrink:0 }}>
        <Wordmark size={isMobile?"15px":"17px"}/>
        {!isMobile && <>
          <span style={{ width:"1px", height:"12px", background:"#1A1A1A", flexShrink:0 }}/>
          <span style={{ fontSize:"9px", color:"#C8A458", letterSpacing:".12em", textTransform:"uppercase" }}>{sessionMode}</span>
          {intensityMeta()}
        </>}
        <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", gap:"10px" }}>
          <button onClick={() => { hasOpenedMusic.current = true; setShowPlayer(p => !p); }} title="Music" style={{ background:"none", border:"1px solid #1A1A1A", borderRadius:"999px", color:"#C8A458", padding:"5px 12px", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", transition:"border-color .2s, color .2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#2A2520"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1A1A1A"; }}>
            {!isMobile && <span style={{ display:"flex", alignItems:"flex-end", gap:"1.5px" }}>
              {[0,.1,.2,.1,0].map((d,i) => <div key={i} style={{ width:"2px", height:`${4+i*2.5}px`, background:"currentColor", borderRadius:"1px", animation:`waveBar .6s ease-in-out ${d}s infinite`, opacity:0.7 }}/>)}
            </span>}
            {!isMobile && <span style={{ fontSize:"9px", letterSpacing:".1em", textTransform:"uppercase" }}>Music</span>}
          </button>
          <button onClick={() => setWarmMode(w => !w)} title={warmMode ? "Warm mode on" : "Warm mode off"} style={{ background:"none", border:"1px solid #1A1A1A", borderRadius:"999px", color:"#C8A458", padding:"5px 12px", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", transition:"border-color .2s, color .2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#2A2520"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1A1A1A"; }}>
            <IconLamp/>
            {!isMobile && <span style={{ fontSize:"9px", letterSpacing:".1em", textTransform:"uppercase" }}>Warm</span>}
          </button>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <button onClick={()=>setIsMobile(p=>!p)} style={{ background:"none", border:"1px solid #1A1A1A", color:"#C8A458", padding:"6px 8px", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color .2s, color .2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#2A2520"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1A1A1A"; }}>
            {isMobile ? <IconDesktop/> : <IconMobile/>}
          </button>
          <button onClick={()=>{stopSpeech();setSpeechEnabled(p=>!p);}} style={{ background:"none", border:"1px solid #1A1A1A", color:speechEnabled?sessionAccent:"#1E1E1E", padding:"6px 8px", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color .2s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#2A2520"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#1A1A1A"}>
            {speechEnabled ? <IconVolume/> : <IconMute/>}
          </button>
          <button onClick={resetSession} style={{ background:"none", border:"1px solid #1A1A1A", color:"#C8A458", fontFamily:"inherit", fontSize:"9px", padding:"6px 14px", letterSpacing:".1em", textTransform:"uppercase", transition:"border-color .2s, color .2s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#2A2520"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor="#1A1A1A"; }}>
            {lang==="id"?"Baru":"New"}
          </button>
        </div>
      </div>

      {isMobile ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Mobile character strip — title sits to the LEFT in a side-by-side row
              so the character itself can be scaled up larger in the center. */}
          <div style={{ background:isTransitioning?"#0E0D0B":charMeta.bg, transition:"background .4s ease", borderBottom:"1px solid #141414", padding:"14px 12px", display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"center", gap:"10px", flexShrink:0 }}>
            <div style={{ textAlign:"right", maxWidth:"26%", flexShrink:0 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"15px", color:charMeta.accent, marginBottom:"2px" }}>{charMeta.name}</div>
              <div style={{ fontSize:"9px", color:"#C8A458", letterSpacing:".1em", textTransform:"uppercase" }}>{charMeta.title}</div>
              {currentMood !== "neutral" && (
                <div style={{ marginTop:"5px", display:"inline-flex", alignItems:"center", gap:"5px" }}>
                  <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:charMeta.accent }}/>
                  <span style={{ fontSize:"8px", color:charMeta.accent, letterSpacing:".1em", textTransform:"uppercase", opacity:.8 }}>{currentMood}</span>
                </div>
              )}
            </div>
            {charAnimBlock("170px", "170px")}
            {isSpeaking && <div style={{ display:"flex", gap:"2px", alignItems:"flex-end", flexShrink:0 }}>{[0,.1,.2,.1,0].map((d,i)=><div key={i} style={{ width:"2px", height:`${4+i*2.5}px`, background:charMeta.accent, borderRadius:"1px", animation:`waveBar .6s ease-in-out ${d}s infinite`, opacity:.7 }}/>)}</div>}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"24px 16px 12px", display:"flex", flexDirection:"column", gap:"28px", position:"relative" }}>
            <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 20%, rgba(212,160,40,0.16) 0%, rgba(180,110,10,0.07) 45%, transparent 75%)", opacity:warmMode?1:0, transition:"opacity 1s ease" }}/>
            {msgList("15px")}
            {loading && loadingDots()}
            {error && <p style={{ fontSize:"11px", color:"#BC5A5A", textAlign:"center" }}>{error}</p>}
            <div ref={chatEndRef}/>
          </div>
          <div style={{ padding:"8px 16px 16px", borderTop:"1px solid #141414", background:"#0E0D0B" }}>
            {actionRow(true)}
            {inputControls("15px","12px 14px","48px")}
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {/* Desktop sidebar — 340px, right edge matches the YouTube/Now-Playing embed width */}
          <div style={{ width:"340px", flexShrink:0, borderRight:"1px solid #141414", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", background:isTransitioning?"#0E0D0B":`radial-gradient(ellipse at 50% 40%, ${charMeta.bg} 0%, #0E0D0B 75%)`, transition:"background .5s ease", position:"fixed", top:"56px", left:0, height:"calc(100vh - 56px)", overflow:"hidden auto", zIndex:10 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"16px", padding:"32px 16px 24px", paddingBottom:showPlayer?"232px":"24px", transition:"padding-bottom .25s ease", width:"100%" }}>
              <div style={{ textAlign:"center", opacity:isTransitioning?0:1, transition:"opacity .38s", width:"100%" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"16px", color:charMeta.accent, marginBottom:"6px" }}>{charMeta.name}</div>
                <div style={{ fontSize:"9px", color:"#C8A458", letterSpacing:".1em", textTransform:"uppercase", lineHeight:1.6 }}>{charMeta.title}</div>
                {currentMood !== "neutral" && (
                  <div style={{ marginTop:"12px", display:"inline-flex", alignItems:"center", gap:"7px" }}>
                    <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:charMeta.accent, opacity:.85 }}/>
                    <span style={{ fontSize:"9px", color:charMeta.accent, letterSpacing:".12em", textTransform:"uppercase", opacity:.75 }}>{currentMood}</span>
                  </div>
                )}
              </div>
              {charAnimBlock("283px", undefined, "-28px")}
              {isSpeaking && <div style={{ display:"flex", gap:"3px", alignItems:"flex-end" }}>{[0,.1,.2,.1,0].map((d,i)=><div key={i} style={{ width:"2px", height:`${5+i*3.5}px`, background:charMeta.accent, borderRadius:"1px", animation:`waveBar .6s ease-in-out ${d}s infinite`, opacity:.6 }}/>)}</div>}
            </div>
          </div>

          {/* Desktop chat */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", marginLeft:"340px" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"32px 32px 16px", display:"flex", flexDirection:"column", gap:"28px", alignItems:"stretch", position:"relative" }}>
              <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse at 50% 15%, rgba(212,160,40,0.16) 0%, rgba(180,110,10,0.07) 45%, transparent 75%)", opacity:warmMode?1:0, transition:"opacity 1s ease" }}/>
              <div style={{ maxWidth:"680px", width:"100%", margin:"0 auto", display:"flex", flexDirection:"column", gap:"28px" }}>
                {msgList("15px")}
                {loading && loadingDots()}
                {error && <p style={{ fontSize:"11px", color:"#BC5A5A", textAlign:"center" }}>{error}</p>}
              </div>
              <div ref={chatEndRef}/>
            </div>
            <div style={{ padding:"10px 32px 24px", borderTop:"1px solid #141414" }}>
              <div style={{ maxWidth:"680px", margin:"0 auto" }}>
                {actionRow()}
                {inputControls("15px","12px 14px","52px")}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Music widget — persists across all screens (hidden on mobile session screen) */}
      {showPlayer && !isMobile && <MusicWidget activePlaylist={activePlaylist} setActivePlaylist={setActivePlaylist} onClose={() => setShowPlayer(false)}/>}
      {/* Session radio button — bottom-left, below music widget (hidden on mobile) */}
      {!isMobile && (
      <div
        onClick={() => setShowPlayer(p => !p)}
        onMouseEnter={e => e.currentTarget.style.background="#141410"}
        onMouseLeave={e => e.currentTarget.style.background="#0A0A0A"}
        style={{ position:"fixed", bottom:0, left:0, zIndex:490, width:"48px", height:"48px", background:"#0A0A0A", borderTop:`1px solid ${showPlayer?"#C8A870":"#1E1E1E"}`, borderRight:`1px solid ${showPlayer?"#C8A870":"#1E1E1E"}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"background 0.2s ease" }}>
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
          {/* Body */}
          <rect x="1" y="5" width="17" height="11" rx="1.5" fill="#4A4A52" stroke="#5A5A62" strokeWidth="1"/>
          {/* Grille lines */}
          <line x1="3" y1="8" x2="12" y2="8" stroke="#3A3A42" strokeWidth="0.8" opacity="0.9"/>
          <line x1="3" y1="11" x2="12" y2="11" stroke="#3A3A42" strokeWidth="0.8" opacity="0.9"/>
          {/* Knob */}
          <circle cx="16" cy="8.5" r="2" fill="#6A6A72"/>
          {/* Antenna */}
          <line x1="19" y1="5" x2="23" y2="0.5" stroke={showPlayer?"#C8A870":"#5A5A62"} strokeWidth="1"
            style={showPlayer ? {animation:"antennaP 1s ease-in-out infinite"} : {opacity:0.6}}/>
        </svg>
      </div>
      )}
    </div>
  );
}

function MusicWidget({ activePlaylist, setActivePlaylist, onClose }) {
  return (
    <div className="music-widget-mobile" style={{ position:"fixed", bottom:0, left:0, right:"auto", zIndex:500, background:"#0A0A0A", border:"1px solid #2A2520", borderRadius:"0 8px 0 0", width:"340px", boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>
      {/* Header */}
      <div style={{ padding:"8px 12px", borderBottom:"1px solid #141414", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:"9px", letterSpacing:".12em", textTransform:"uppercase", color:"#C8A458" }}>Now Playing</span>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#C8A458", fontSize:"16px", lineHeight:1, cursor:"pointer", padding:0 }}>×</button>
      </div>
      {/* Playlist selector */}
      <div style={{ padding:"6px 12px", display:"flex", gap:"5px", overflowX:"auto", scrollbarWidth:"none" }}>
        {PLAYLISTS.map((pl, i) => (
          <button key={i} onClick={() => setActivePlaylist(i)}
            style={{ padding:"3px 8px", border:`1px solid ${activePlaylist===i?"#C8A870":"#1E1E1E"}`, color:activePlaylist===i?"#C8A870":"#C8A458", fontFamily:"'Manrope',sans-serif", fontWeight:300, fontSize:"9px", letterSpacing:".06em", background:"none", cursor:"pointer", flexShrink:0, transition:"border-color .2s, color .2s" }}>
            {pl.label}
          </button>
        ))}
      </div>
      {/* YouTube embed */}
      <iframe
        className="music-widget-iframe-mobile"
        key={PLAYLISTS[activePlaylist].id}
        src={`https://www.youtube.com/embed/${PLAYLISTS[activePlaylist].id}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0`}
        width="100%" height="152" frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        style={{ display:"block" }}
      />
    </div>
  );
}
