/**
 * marma-data.js
 * Static reference data for the Marma AR application.
 *
 * MARMA_DB: clinical database of all 107 Marma vital points.
 * Schema per entry: [fullName, sizeAngula, tissueType, category, clinicalDescription]
 * Category values: 'sadya' | 'kalantara' | 'vaikalya' | 'rujak'
 *
 * Sources: Sushruta Samhita, Ashtanga Hridayam, classical Ayurvedic anatomy.
 */

export const MARMA_DB = {
  // ── Head ─────────────────────────────────────────────────────────────
  "Adhipati": ["Adhipati", 1, "Sira (vessel)", "sadya", "Crown of skull. Junction of all vital vessels. Injury causes instant death. Sushruta: 'Sarvamarmanam uttamam' - the chief of all Marma."],
  "Sthapani": ["Sthapani", 1, "Sira (vessel)", "sadya", "Glabella - between the eyebrows. Seat of Prana and higher consciousness. Direct injury causes immediate cessation of life force."],
  "Shankha L": ["Shankha (L)", 2, "Asthi (bone)", "sadya", "Left temple. Thin temporal bone overlies the middle meningeal artery. Fracture causes fatal epidural haemorrhage within minutes."],
  "Shankha R": ["Shankha (R)", 2, "Asthi (bone)", "sadya", "Right temple. Thin temporal bone overlies the middle meningeal artery. Fracture causes fatal epidural haemorrhage."],
  "Utkshepa L": ["Utkshepa (L)", 1, "Sira (vessel)", "vaikalya", "Left pterion area. Injury damages the middle meningeal vessel, causing ipsilateral limb paralysis."],
  "Utkshepa R": ["Utkshepa (R)", 1, "Sira (vessel)", "vaikalya", "Right pterion area. Injury damages the middle meningeal vessel, causing ipsilateral limb paralysis."],
  "Apanga L": ["Apanga (L)", 1, "Sira (vessel)", "vaikalya", "Left outer canthus of the eye. Injury to lateral palpebral vessels causes permanent blindness or severe visual defects."],
  "Apanga R": ["Apanga (R)", 1, "Sira (vessel)", "vaikalya", "Right outer canthus of the eye. Injury causes permanent blindness or severe visual defects."],
  "Avarta L": ["Avarta (L)", 1, "Snayu (ligament)", "vaikalya", "Left supraorbital notch. Injury to supraorbital nerve/vessel causes severe intractable headache and visual loss."],
  "Avarta R": ["Avarta (R)", 1, "Snayu (ligament)", "vaikalya", "Right supraorbital notch. Injury causes severe headache and visual loss."],
  "Phana L": ["Phana (L)", 1, "Sira (vessel)", "vaikalya", "Left alar base of nose. Injury to olfactory nerve endings causes permanent anosmia (loss of smell)."],
  "Phana R": ["Phana (R)", 1, "Sira (vessel)", "vaikalya", "Right alar base of nose. Injury causes permanent anosmia (loss of smell)."],
  "Shring.1": ["Shringataka-1", 4, "Sira (vessel)", "sadya", "Lingual srotas junction (soft palate). One of 4 Shringataka - convergence of major sensory vessels supplying all sense organs. Instantly fatal."],
  "Shring.2": ["Shringataka-2", 4, "Sira (vessel)", "sadya", "Nasal srotas junction. Injury disrupts prana flow to all sense organs. Sushruta: 'Shringatakam chaturvidham'."],
  "Shring.3L": ["Shringataka-3 (L)", 4, "Sira (vessel)", "sadya", "Left auricular srotas junction. One of the 4 Shringataka - all instantly fatal. Injury disrupts all cranial nerve function."],
  "Shring.3R": ["Shringataka-3 (R)", 4, "Sira (vessel)", "sadya", "Right auricular srotas junction. One of the 4 Shringataka - all instantly fatal."],
  "Vidhura L": ["Vidhura (L)", 1, "Snayu (ligament)", "vaikalya", "Left mastoid / post-auricular region. Injury damages the posterior auricular nerve, causing permanent ipsilateral deafness."],
  "Vidhura R": ["Vidhura (R)", 1, "Snayu (ligament)", "vaikalya", "Right mastoid / post-auricular region. Injury causes permanent ipsilateral deafness."],
  "Krikatika L": ["Krikatika (L)", 1, "Sandhi (joint)", "vaikalya", "Left occipito-cervical junction (C0–C1). Injury disrupts the atlanto-occipital joint, causing torticollis and neck stiffness."],
  "Krikatika R": ["Krikatika (R)", 1, "Sandhi (joint)", "vaikalya", "Right occipito-cervical junction. Injury causes torticollis and permanent neck stiffness."],
  "Simanta.B": ["Simanta (Bregma)", 4, "Sandhi (joint)", "kalantara", "Bregma - junction of coronal and sagittal sutures. Injury causes delayed death from rising intracranial pressure."],
  "Simanta.SL": ["Simanta-Sagittal L", 4, "Sandhi (joint)", "kalantara", "Left temporal suture region. Part of the 5-point Simanta group - cranial suture Marma causing delayed fatal injury."],
  "Simanta.SR": ["Simanta-Sagittal R", 4, "Sandhi (joint)", "kalantara", "Right temporal suture region. Part of the 5-point Simanta group."],
  "Simanta.LL": ["Simanta-Lambda L", 4, "Sandhi (joint)", "kalantara", "Left lambdoid suture junction. Part of the 5-point Simanta group."],
  "Simanta.LR": ["Simanta-Lambda R", 4, "Sandhi (joint)", "kalantara", "Right lambdoid suture junction. Part of the 5-point Simanta group - all five cranial suture points are Kalantara Pranahara."],
  // ── Neck ─────────────────────────────────────────────────────────────
  "Manya L": ["Manya (L)", 4, "Sira (vessel)", "sadya", "Left common carotid artery. Sushruta: 'Manyabhighate maranam' - striking this point causes immediate death from cerebral ischaemia."],
  "Manya R": ["Manya (R)", 4, "Sira (vessel)", "sadya", "Right common carotid artery. Instant death from cerebral ischaemia. One of the most dangerous vital points."],
  "Nila L": ["Nila (L)", 4, "Sira (vessel)", "kalantara", "Left external jugular / anterior neck vessel. Injury causes delayed hoarseness, dysphagia, and eventual death from haemorrhage."],
  "Nila R": ["Nila (R)", 4, "Sira (vessel)", "kalantara", "Right external jugular / anterior neck vessel. Injury causes delayed hoarseness, dysphagia, and death."],
  "SiraMat.L1": ["Sira Matrika L-1", 4, "Sira (vessel)", "sadya", "Left internal carotid zone. One of 8 Sira Matrika - mother vessels of the neck. Instantly fatal if severed."],
  "SiraMat.L2": ["Sira Matrika L-2", 4, "Sira (vessel)", "sadya", "Left external carotid zone. One of 8 Sira Matrika - major cervical vessels. Instantly fatal if severed."],
  "SiraMat.L3": ["Sira Matrika L-3", 4, "Sira (vessel)", "sadya", "Left internal jugular zone. One of 8 Sira Matrika - major cervical vessels."],
  "SiraMat.L4": ["Sira Matrika L-4", 4, "Sira (vessel)", "sadya", "Left external jugular zone. One of 8 Sira Matrika."],
  "SiraMat.R1": ["Sira Matrika R-1", 4, "Sira (vessel)", "sadya", "Right internal carotid zone. One of 8 Sira Matrika - mother vessels of the neck. Instantly fatal if severed."],
  "SiraMat.R2": ["Sira Matrika R-2", 4, "Sira (vessel)", "sadya", "Right external carotid zone. One of 8 Sira Matrika."],
  "SiraMat.R3": ["Sira Matrika R-3", 4, "Sira (vessel)", "sadya", "Right internal jugular zone. One of 8 Sira Matrika."],
  "SiraMat.R4": ["Sira Matrika R-4", 4, "Sira (vessel)", "sadya", "Right external jugular zone. One of 8 Sira Matrika."],
  // ── Trunk - front ────────────────────────────────────────────────────
  "Amsa L": ["Amsa (L)", 1, "Sandhi (joint)", "kalantara", "Left shoulder joint. Injury causes Akshepa - progressive wasting of the arm. Also an important therapeutic Marma for pain management."],
  "Amsa R": ["Amsa (R)", 1, "Sandhi (joint)", "kalantara", "Right shoulder joint. Injury causes progressive wasting of the arm. Safe pressure zone for Marma therapy."],
  "Hridaya": ["Hridaya", 4, "Sira (vessel)", "sadya", "Heart centre - mid-sternum. Chetana Sthan (seat of consciousness). Direct trauma causes immediate cardiac arrest. Most important of all vital points."],
  "Nabhi": ["Nabhi", 4, "Sira (vessel)", "sadya", "Navel - junction of 72,000 Nadis (energy channels). Injury disrupts all bodily functions simultaneously. Instantly and irreversibly fatal."],
  "Basti": ["Basti", 4, "Sira (vessel)", "sadya", "Bladder/suprapubic. Bladder rupture allows urine into the peritoneum, causing septic shock and death within hours."],
  "Stanaro. L": ["Stanarohita (L)", 1, "Sira (vessel)", "kalantara", "Left breast, above nipple. Injury to lactiferous and intercostal vessels causes delayed pulmonary haemorrhage."],
  "Stanaro. R": ["Stanarohita (R)", 1, "Sira (vessel)", "kalantara", "Right breast, above nipple. Injury causes delayed pulmonary complications."],
  "Stanamula L": ["Stanamula (L)", 1, "Sira (vessel)", "kalantara", "Left breast base / costal margin. Injury causes delayed haemothorax and progressive lung complications."],
  "Stanamula R": ["Stanamula (R)", 1, "Sira (vessel)", "kalantara", "Right breast base. Injury causes delayed haemothorax and lung complications."],
  "Apastambha L": ["Apastambha (L)", 1, "Sira (vessel)", "kalantara", "Left parasternal chest. Injury to internal thoracic and intercostal vessels causes delayed haemorrhage."],
  "Apastambha R": ["Apastambha (R)", 1, "Sira (vessel)", "kalantara", "Right parasternal chest. Injury to internal thoracic vessels causes delayed haemorrhage."],
  "Apalapa L": ["Apalapa (L)", 1, "Sira (vessel)", "kalantara", "Left anterior axillary fold. Injury to thoracoacromial vessels affects respiratory muscles, causing delayed breathlessness."],
  "Apalapa R": ["Apalapa (R)", 1, "Sira (vessel)", "kalantara", "Right anterior axillary fold. Injury affects respiratory muscles and causes delayed breathlessness."],
  // ── Trunk - back ─────────────────────────────────────────────────────
  "Katika L": ["Katikataruna (L)", 1, "Asthi (bone)", "vaikalya", "Left PSIS (posterior superior iliac spine). Injury to the iliolumbar region causes permanent lower limb weakness and gait disturbance."],
  "Katika R": ["Katikataruna (R)", 1, "Asthi (bone)", "vaikalya", "Right PSIS. Injury causes permanent lower limb weakness and gait disturbance."],
  "Kukundara L": ["Kukundara (L)", 1, "Sandhi (joint)", "vaikalya", "Left sacroiliac joint. Injury causes permanent sciatic nerve pain, lower limb deformity, and altered gait."],
  "Kukundara R": ["Kukundara (R)", 1, "Sandhi (joint)", "vaikalya", "Right sacroiliac joint. Injury causes permanent sciatic pain and lower limb deformity."],
  "Nitamba L": ["Nitamba (L)", 1, "Mamsa (muscle)", "vaikalya", "Left gluteal region - gluteus maximus. Injury causes paralysis of hip abductors and permanent limp."],
  "Nitamba R": ["Nitamba (R)", 1, "Mamsa (muscle)", "vaikalya", "Right gluteal region. Injury causes paralysis of hip abductors and permanent limp."],
  "Parshva L": ["Parshvasandhi (L)", 1, "Sandhi (joint)", "vaikalya", "Left posterior flank / 12th rib junction. Injury causes flank pain and kidney/ureter dysfunction."],
  "Parshva R": ["Parshvasandhi (R)", 1, "Sandhi (joint)", "vaikalya", "Right posterior flank / 12th rib junction. Injury causes flank pain and kidney dysfunction."],
  "AmsaPhal. L": ["Amsaphalaka (L)", 1, "Asthi (bone)", "vaikalya", "Left scapula centre. Injury causes permanent frozen shoulder, rotator cuff damage, and arm weakness."],
  "AmsaPhal. R": ["Amsaphalaka (R)", 1, "Asthi (bone)", "vaikalya", "Right scapula centre. Injury causes permanent frozen shoulder and arm weakness."],
  "Brihati L": ["Brihati (L)", 1, "Sira (vessel)", "kalantara", "Left para-spinal region at T6–T8. Injury to intercostal vessels causes delayed respiratory paralysis."],
  "Brihati R": ["Brihati (R)", 1, "Sira (vessel)", "kalantara", "Right para-spinal at T6–T8. Injury causes delayed respiratory paralysis."],
  "Guda": ["Guda", 4, "Sira (vessel)", "sadya", "Perineum/anal region. Seat of Apana Vayu. Injury causes fatal disruption of all elimination and parasympathetic nervous functions."],
  // ── Arms - left ──────────────────────────────────────────────────────
  "Tala H. L": ["Talahridaya L (hand)", 1, "Sira (vessel)", "vaikalya", "Left palm centre. Primary therapeutic Marma - safe for firm pressure in Padabhyanga and Marma massage. Injury causes hand weakness."],
  "Kshipra L": ["Kshipra L (hand)", 1, "Snayu (ligament)", "vaikalya", "Left hand thumb-index web space (1st interosseous). 'Quick action' - stimulation produces rapid systemic effects."],
  "Kurcha L": ["Kurcha (L)", 4, "Snayu (ligament)", "rujak", "Left thenar eminence. Rujakara - safe for therapeutic stimulation. Injury causes only local pain."],
  "KurchaS. L": ["Kurchashira (L)", 2, "Snayu (ligament)", "rujak", "Left wrist-thumb junction. Injury causes wrist pain (De Quervain's region). Safe for needle therapy."],
  "Maniband. L": ["Manibandha (L)", 2, "Sandhi (joint)", "vaikalya", "Left wrist joint. Injury causes permanent wrist drop. Important therapeutic point for heart and lung channels."],
  "Indrabas. L": ["Indravasti L (arm)", 2, "Sira (vessel)", "kalantara", "Left forearm midpoint - radial artery zone. Injury causes delayed blood loss and arm ischaemia."],
  "Kurpara L": ["Kurpara (L)", 3, "Sandhi (joint)", "vaikalya", "Left elbow joint. Injury causes permanent elbow contracture. Key diagnostic point in Vata disorders."],
  "Ani L": ["Ani L (arm)", 4, "Snayu (ligament)", "vaikalya", "Left distal humerus - 3 Angula above elbow. Injury causes radial nerve palsy and permanent wrist drop."],
  "Urvi L": ["Urvi L (arm)", 4, "Mamsa (muscle)", "vaikalya", "Left mid-upper arm. Injury causes musculocutaneous nerve palsy and biceps paralysis."],
  "Lohitaksha L": ["Lohitaksha L (arm)", 1, "Sira (vessel)", "kalantara", "Left brachial artery / axillary fold. Injury causes delayed arm ischaemia and risk of gangrene."],
  "Kaksha. L": ["Kaksha (L)", 1, "Snayu (ligament)", "vaikalya", "Left axilla. Injury causes brachial plexus damage - permanent total arm paralysis."],
  // ── Arms - right ─────────────────────────────────────────────────────
  "Tala H. R": ["Talahridaya R (hand)", 1, "Sira (vessel)", "vaikalya", "Right palm centre. Therapeutic Marma - safe for Ayurvedic massage. Injury causes hand weakness."],
  "Kshipra R": ["Kshipra R (hand)", 1, "Snayu (ligament)", "vaikalya", "Right hand thumb-index web space. 'Quick action' - stimulation produces rapid systemic effects."],
  "Kurcha R": ["Kurcha (R)", 4, "Snayu (ligament)", "rujak", "Right thenar eminence. Rujakara - safe for acupuncture and Marma therapy."],
  "KurchaS. R": ["Kurchashira (R)", 2, "Snayu (ligament)", "rujak", "Right wrist-thumb junction. Safe for needle therapy."],
  "Maniband. R": ["Manibandha (R)", 2, "Sandhi (joint)", "vaikalya", "Right wrist joint. Injury causes permanent wrist drop. Therapeutic point for heart and lung channels."],
  "Indrabas. R": ["Indravasti R (arm)", 2, "Sira (vessel)", "kalantara", "Right forearm midpoint. Injury to radial artery causes delayed blood loss and arm ischaemia."],
  "Kurpara R": ["Kurpara (R)", 3, "Sandhi (joint)", "vaikalya", "Right elbow joint. Injury causes permanent elbow contracture."],
  "Ani R": ["Ani R (arm)", 4, "Snayu (ligament)", "vaikalya", "Right distal humerus - 3 Angula above elbow. Injury causes radial nerve palsy and wrist drop."],
  "Urvi R": ["Urvi R (arm)", 4, "Mamsa (muscle)", "vaikalya", "Right mid-upper arm. Injury causes biceps paralysis."],
  "Lohitaksha R": ["Lohitaksha R (arm)", 1, "Sira (vessel)", "kalantara", "Right brachial artery / axillary fold. Injury causes delayed arm ischaemia."],
  "Kaksha. R": ["Kaksha (R)", 1, "Snayu (ligament)", "vaikalya", "Right axilla. Injury causes brachial plexus damage - permanent total arm paralysis."],
  // ── Legs - left ──────────────────────────────────────────────────────
  "Tala F. L": ["Talahridaya L (foot)", 1, "Sira (vessel)", "vaikalya", "Left sole centre. Therapeutic - used in Padabhyanga (foot massage). Injury causes foot weakness."],
  "Kshipra f L": ["Kshipra L (foot)", 1, "Snayu (ligament)", "vaikalya", "Left foot web space (great-second toe). Stimulation rapidly affects respiratory system."],
  "Kurcha f L": ["Kurcha L (foot)", 4, "Snayu (ligament)", "rujak", "Left dorsal foot near metatarsal base. Rujakara - safe for acupressure therapy."],
  "KurchaS.f L": ["Kurchashira L (foot)", 2, "Snayu (ligament)", "rujak", "Left heel / calcaneum. Safe for therapeutic heel pressure. Injury causes plantar fasciitis-type pain."],
  "Gulpha L": ["Gulpha (L)", 2, "Sandhi (joint)", "vaikalya", "Left ankle joint. Injury causes permanent foot drop. Important for Vata disorders of the lower limb."],
  "Indra.Lg L": ["Indravasti L (leg)", 2, "Sira (vessel)", "kalantara", "Left calf midpoint - posterior tibial artery. Injury causes delayed leg ischaemia."],
  "Janu L": ["Janu (L)", 3, "Sandhi (joint)", "vaikalya", "Left knee joint. Injury causes permanent instability and deformity. Key diagnostic Marma for lower-body disorders."],
  "Ani Lg L": ["Ani L (leg)", 4, "Snayu (ligament)", "vaikalya", "Left distal thigh - 3 Angula above knee. Injury causes femoral nerve palsy and quadriceps paralysis."],
  "Urvi Lg L": ["Urvi L (leg)", 4, "Mamsa (muscle)", "vaikalya", "Left mid-thigh. Injury to the sciatic nerve causes leg paralysis and permanent gait deformity."],
  "Lohita.Lg L": ["Lohitaksha L (leg)", 1, "Sira (vessel)", "kalantara", "Left femoral artery zone / groin. Injury causes delayed leg ischaemia and potential amputation."],
  "Vitapa L": ["Vitapa (L)", 1, "Snayu (ligament)", "vaikalya", "Left inguinal region. Injury to spermatic cord / round ligament causes scrotal or ovarian pain and reproductive dysfunction."],
  // ── Legs - right ─────────────────────────────────────────────────────
  "Tala F. R": ["Talahridaya R (foot)", 1, "Sira (vessel)", "vaikalya", "Right sole centre. Therapeutic point in Padabhyanga."],
  "Kshipra f R": ["Kshipra R (foot)", 1, "Snayu (ligament)", "vaikalya", "Right foot web space. Quick-acting - stimulation affects respiratory system."],
  "Kurcha f R": ["Kurcha R (foot)", 4, "Snayu (ligament)", "rujak", "Right dorsal foot. Safe for acupressure therapy."],
  "KurchaS.f R": ["Kurchashira R (foot)", 2, "Snayu (ligament)", "rujak", "Right heel. Safe for therapeutic heel pressure."],
  "Gulpha R": ["Gulpha (R)", 2, "Sandhi (joint)", "vaikalya", "Right ankle joint. Injury causes permanent foot drop."],
  "Indra.Lg R": ["Indravasti R (leg)", 2, "Sira (vessel)", "kalantara", "Right calf midpoint. Injury causes delayed leg ischaemia."],
  "Janu R": ["Janu (R)", 3, "Sandhi (joint)", "vaikalya", "Right knee joint. Injury causes permanent instability and deformity."],
  "Ani Lg R": ["Ani R (leg)", 4, "Snayu (ligament)", "vaikalya", "Right distal thigh. Injury causes femoral nerve palsy and quadriceps paralysis."],
  "Urvi Lg R": ["Urvi R (leg)", 4, "Mamsa (muscle)", "vaikalya", "Right mid-thigh. Injury causes sciatic nerve palsy and leg paralysis."],
  "Lohita.Lg R": ["Lohitaksha R (leg)", 1, "Sira (vessel)", "kalantara", "Right femoral artery zone. Injury causes delayed leg ischaemia and potential amputation."],
  "Vitapa R": ["Vitapa (R)", 1, "Snayu (ligament)", "vaikalya", "Right inguinal region. Injury causes reproductive pain and dysfunction."],
};

/** Colour per IKS consequence category (hex, used on canvas) */
export const COLORS = {
  sadya: '#ff2d2d',
  kalantara: '#ff8c00',
  vaikalya: '#e8e800',
  rujak: '#00e040',
};

export const CAT_LABELS = {
  sadya: 'Sadya Pranahara',
  kalantara: 'Kalantara Pranahara',
  vaikalya: 'Vaikalyakara',
  rujak: 'Rujakara',
};

export const CAT_META = {
  sadya: { shortLabel: 'Immediately Fatal', safe: false },
  kalantara: { shortLabel: 'Delayed Fatal', safe: false },
  vaikalya: { shortLabel: 'Permanent Disability', safe: false },
  rujak: { shortLabel: 'Therapeutically Safe', safe: true },
};

const REGION_RULES = [
  // Head & Neck - must come before trunk checks
  {
    keys: ['Adhipati', 'Sthapani', 'Shankha', 'Utkshepa', 'Apanga', 'Avarta',
      'Phana', 'Shring', 'Vidhura', 'Krikatika', 'Simanta',
      'Manya', 'Nila', 'SiraMat'],
    region: 'Head & Neck'
  },
  // Upper Extremities
  {
    keys: ['Tala H.', 'Kshipra L', 'Kshipra R', 'Kurcha L', 'Kurcha R',
      'KurchaS. L', 'KurchaS. R', 'Maniband.', 'Indrabas.',
      'Kurpara', 'Ani L', 'Ani R', 'Urvi L', 'Urvi R',
      'Lohitaksha L', 'Lohitaksha R', 'Kaksha.'],
    region: 'Upper Extremities'
  },
  // Lower Extremities
  {
    keys: ['Tala F.', 'Kshipra f', 'Kurcha f', 'KurchaS.f',
      'Gulpha', 'Indra.Lg', 'Janu', 'Ani Lg', 'Urvi Lg',
      'Lohita.Lg', 'Vitapa'],
    region: 'Lower Extremities'
  },
  // Trunk - everything else
];

export function getRegion(key) {
  for (const rule of REGION_RULES) {
    if (rule.keys.some(k => key.startsWith(k) || key === k)) {
      return rule.region;
    }
  }
  return 'Trunk';
}

/**
 * MediaPipe Pose landmark skeleton connections.
 * Index pairs reference the 33-landmark model from BlazePose.
 */
export const SKEL_EDGES = [
  // Face outline
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];
