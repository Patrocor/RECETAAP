import { readFileSync, writeFileSync } from "node:fs";
import { cie10Data } from "../catalogos.js";

const SISTEMA = {
  "Salud mental": "Salud Mental",
  "Músculo-esquelético": "Musculoesquelético",
  "Infeccioso": "Infecciosas",
  "Neoplasias": "Oncología",
  "Metabólico": "Endocrino/Metabólico",
  "Traumatología": "Traumatismos",
  "Síntomas generales": "Síntomas y Signos",
};

const COMPLEMENTO = [
  ["K25.4", "Úlcera gástrica crónica con hemorragia", "Digestivo"],
  ["K25.5", "Úlcera gástrica crónica con perforación", "Digestivo"],
  ["K25.6", "Úlcera gástrica crónica con hemorragia y perforación", "Digestivo"],
  ["K26.4", "Úlcera duodenal crónica con hemorragia", "Digestivo"],
  ["K26.5", "Úlcera duodenal crónica con perforación", "Digestivo"],
  ["K27.3", "Úlcera péptica aguda sin hemorragia ni perforación", "Digestivo"],
  ["K27.7", "Úlcera péptica crónica sin hemorragia ni perforación", "Digestivo"],
  ["K29.2", "Gastritis alcohólica", "Digestivo"],
  ["K29.5", "Gastritis crónica no especificada", "Digestivo"],
  ["K29.6", "Otras gastritis", "Digestivo"],
  ["K21.0", "Enfermedad por reflujo gastroesofágico con esofagitis", "Digestivo"],
  ["K21.9", "Enfermedad por reflujo gastroesofágico sin esofagitis", "Digestivo"],
  ["K52.9", "Gastroenteritis y colitis no infecciosa no especificada", "Digestivo"],
  ["K57.3", "Enfermedad diverticular del colon sin perforación ni absceso", "Digestivo"],
  ["K57.9", "Enfermedad diverticular intestinal sin perforación ni absceso", "Digestivo"],
  ["K58.0", "Síndrome de intestino irritable con diarrea", "Digestivo"],
  ["K58.9", "Síndrome de intestino irritable sin diarrea", "Digestivo"],
  ["K59.0", "Estreñimiento", "Digestivo"],
  ["K59.1", "Diarrea funcional", "Digestivo"],
  ["K80.4", "Cálculo de la vía biliar con colecistitis", "Digestivo"],
  ["K85.9", "Pancreatitis aguda no especificada", "Digestivo"],
  ["K86.1", "Otras pancreatitis crónicas", "Digestivo"],
  ["K35.8", "Otras apendicitis agudas y las no especificadas", "Digestivo"],
  ["J00", "Rinofaringitis aguda", "Respiratorio"],
  ["J06.8", "Otras infecciones agudas de las vías respiratorias superiores", "Respiratorio"],
  ["J06.9", "Infección aguda de vías respiratorias superiores no especificada", "Respiratorio"],
  ["J12.9", "Neumonía viral no especificada", "Respiratorio"],
  ["J15.9", "Neumonía bacteriana no especificada", "Respiratorio"],
  ["J18.0", "Bronconeumonía no especificada", "Respiratorio"],
  ["J18.1", "Neumonía lobar no especificada", "Respiratorio"],
  ["J18.9", "Neumonía no especificada", "Respiratorio"],
  ["J22", "Infección aguda no especificada de las vías respiratorias inferiores", "Respiratorio"],
  ["J30.0", "Rinitis vasomotora", "Respiratorio"],
  ["J30.1", "Rinitis alérgica debida al polen", "Respiratorio"],
  ["J30.3", "Otras rinitis alérgicas", "Respiratorio"],
  ["J30.4", "Rinitis alérgica no especificada", "Respiratorio"],
  ["J31.1", "Nasofaringitis crónica", "Respiratorio"],
  ["J32.2", "Sinusitis etmoidal crónica", "Respiratorio"],
  ["J32.3", "Sinusitis esfenoidal crónica", "Respiratorio"],
  ["J01.3", "Sinusitis esfenoidal aguda", "Respiratorio"],
  ["J01.4", "Pansinusitis aguda", "Respiratorio"],
  ["J41.8", "Bronquitis crónica mixta simple y mucopurulenta", "Respiratorio"],
  ["J40", "Bronquitis no especificada como aguda o crónica", "Respiratorio"],
  ["J44.8", "Otra enfermedad pulmonar obstructiva crónica", "Respiratorio"],
  ["N30.2", "Otras cistitis crónicas", "Genitourinario"],
  ["N30.3", "Trigonitis", "Genitourinario"],
  ["N30.4", "Cistitis por irradiación", "Genitourinario"],
  ["N39.0", "Infección de vías urinarias, sitio no especificado", "Genitourinario"],
  ["N20.0", "Cálculo del riñón", "Genitourinario"],
  ["N20.1", "Cálculo del uréter", "Genitourinario"],
  ["N20.9", "Cálculo urinario no especificado", "Genitourinario"],
  ["N40", "Hiperplasia de la próstata", "Genitourinario"],
  ["N41.0", "Prostatitis aguda", "Genitourinario"],
  ["N41.1", "Prostatitis crónica", "Genitourinario"],
  ["N18.1", "Enfermedad renal crónica, etapa 1", "Genitourinario"],
  ["N18.2", "Enfermedad renal crónica, etapa 2", "Genitourinario"],
  ["N18.3", "Enfermedad renal crónica, etapa 3", "Genitourinario"],
  ["N18.4", "Enfermedad renal crónica, etapa 4", "Genitourinario"],
  ["N18.5", "Enfermedad renal crónica, etapa 5", "Genitourinario"],
  ["N18.9", "Enfermedad renal crónica no especificada", "Genitourinario"],
  ["H10.2", "Otras conjuntivitis agudas", "Oftalmología"],
  ["H66.3", "Otras otitis medias supurativas crónicas", "Otorrinolaringología"],
  ["H65.4", "Otras otitis medias crónicas no supurativas", "Otorrinolaringología"],
  ["H60.5", "Otitis externa aguda no infecciosa", "Otorrinolaringología"],
  ["H61.2", "Tapón de cerumen", "Otorrinolaringología"],
  ["I11.0", "Enfermedad cardíaca hipertensiva con insuficiencia cardíaca", "Cardiovascular"],
  ["I11.9", "Enfermedad cardíaca hipertensiva sin insuficiencia cardíaca", "Cardiovascular"],
  ["I12.9", "Enfermedad renal hipertensiva sin insuficiencia renal", "Cardiovascular"],
  ["I25.8", "Otras formas de cardiopatía isquémica crónica", "Cardiovascular"],
  ["I47.1", "Taquicardia supraventricular", "Cardiovascular"],
  ["I49.9", "Arritmia cardíaca no especificada", "Cardiovascular"],
  ["I50.0", "Insuficiencia cardíaca congestiva", "Cardiovascular"],
  ["I50.1", "Insuficiencia ventricular izquierda", "Cardiovascular"],
  ["I50.9", "Insuficiencia cardíaca no especificada", "Cardiovascular"],
  ["I63.9", "Infarto cerebral no especificado", "Neurología"],
  ["I64", "Accidente vascular encefálico agudo no especificado", "Neurología"],
  ["I69.3", "Secuelas de infarto cerebral", "Neurología"],
  ["I69.4", "Secuelas de accidente vascular encefálico", "Neurología"],
  ["I70.9", "Aterosclerosis generalizada y la no especificada", "Cardiovascular"],
  ["I83.9", "Várices de miembros inferiores sin úlcera ni inflamación", "Cardiovascular"],
  ["E03.9", "Hipotiroidismo no especificado", "Endocrino/Metabólico"],
  ["E05.9", "Tirotoxicosis no especificada", "Endocrino/Metabólico"],
  ["E16.2", "Hipoglucemia no especificada", "Endocrino/Metabólico"],
  ["E66.9", "Obesidad no especificada", "Endocrino/Metabólico"],
  ["E78.1", "Hipertrigliceridemia pura", "Endocrino/Metabólico"],
  ["E78.2", "Hiperlipidemia mixta", "Endocrino/Metabólico"],
  ["E78.5", "Hiperlipidemia no especificada", "Endocrino/Metabólico"],
  ["E87.5", "Hiperkalemia", "Endocrino/Metabólico"],
  ["E87.6", "Hipokalemia", "Endocrino/Metabólico"],
  ["F41.0", "Trastorno de pánico", "Salud Mental"],
  ["F41.1", "Trastorno de ansiedad generalizada", "Salud Mental"],
  ["F41.2", "Trastorno mixto de ansiedad y depresión", "Salud Mental"],
  ["F43.0", "Reacción al estrés agudo", "Salud Mental"],
  ["F43.1", "Trastorno de estrés postraumático", "Salud Mental"],
  ["F51.0", "Insomnio no orgánico", "Salud Mental"],
  ["F33.4", "Trastorno depresivo recurrente, actualmente en remisión", "Salud Mental"],
  ["G43.0", "Migraña sin aura", "Neurología"],
  ["G43.1", "Migraña con aura", "Neurología"],
  ["G43.9", "Migraña no especificada", "Neurología"],
  ["G40.9", "Epilepsia no especificada", "Neurología"],
  ["G44.2", "Cefalea tensional", "Neurología"],
  ["G45.9", "Ataque isquémico transitorio no especificado", "Neurología"],
  ["G20", "Enfermedad de Parkinson", "Neurología"],
  ["G35", "Esclerosis múltiple", "Neurología"],
  ["G47.0", "Insomnio", "Neurología"],
  ["G56.0", "Síndrome del túnel carpiano", "Neurología"],
  ["G62.9", "Polineuropatía no especificada", "Neurología"],
  ["M54.2", "Cervicalgia", "Musculoesquelético"],
  ["M54.4", "Lumbago con ciática", "Musculoesquelético"],
  ["M54.5", "Lumbago", "Musculoesquelético"],
  ["M17.9", "Gonartrosis no especificada", "Musculoesquelético"],
  ["M16.9", "Coxartrosis no especificada", "Musculoesquelético"],
  ["M19.9", "Artrosis no especificada", "Musculoesquelético"],
  ["M06.9", "Artritis reumatoide no especificada", "Musculoesquelético"],
  ["M10.9", "Gota no especificada", "Musculoesquelético"],
  ["M25.5", "Dolor en articulación", "Musculoesquelético"],
  ["M51.1", "Trastorno de disco lumbar con radiculopatía", "Musculoesquelético"],
  ["M75.1", "Síndrome del manguito rotador", "Musculoesquelético"],
  ["M77.1", "Epicondilitis lateral", "Musculoesquelético"],
  ["M79.1", "Mialgia", "Musculoesquelético"],
  ["M79.7", "Fibromialgia", "Musculoesquelético"],
  ["M81.9", "Osteoporosis no especificada", "Musculoesquelético"],
  ["M32.9", "Lupus eritematoso sistémico no especificado", "Musculoesquelético"],
  ["L20.9", "Dermatitis atópica no especificada", "Dermatología"],
  ["L23.9", "Dermatitis alérgica de contacto, causa no especificada", "Dermatología"],
  ["L30.9", "Dermatitis no especificada", "Dermatología"],
  ["L40.0", "Psoriasis vulgar", "Dermatología"],
  ["L40.9", "Psoriasis no especificada", "Dermatología"],
  ["L50.0", "Urticaria alérgica", "Dermatología"],
  ["L50.1", "Urticaria idiopática crónica", "Dermatología"],
  ["L50.9", "Urticaria no especificada", "Dermatología"],
  ["L70.0", "Acné vulgar", "Dermatología"],
  ["L02.9", "Absceso cutáneo no especificado", "Dermatología"],
  ["L03.9", "Celulitis de sitio no especificado", "Dermatología"],
  ["L08.9", "Infección local de la piel no especificada", "Dermatología"],
  ["L98.4", "Úlcera crónica de la piel no clasificada en otra parte", "Dermatología"],
  ["A09", "Diarrea y gastroenteritis de presunto origen infeccioso", "Infecciosas"],
  ["A15.0", "Tuberculosis pulmonar confirmada por baciloscopia", "Infecciosas"],
  ["A16.2", "Tuberculosis pulmonar sin confirmación bacteriológica", "Infecciosas"],
  ["A54.9", "Infección gonocócica no especificada", "Infecciosas"],
  ["A90", "Dengue clásico", "Infecciosas"],
  ["A91", "Dengue hemorrágico", "Infecciosas"],
  ["B01.9", "Varicela sin complicación", "Pediatría"],
  ["B02.9", "Herpes zóster sin complicación", "Infecciosas"],
  ["B05.9", "Sarampión sin complicación", "Pediatría"],
  ["B08.2", "Exantema súbito", "Pediatría"],
  ["B08.4", "Estomatitis vesicular con exantema", "Pediatría"],
  ["B26.9", "Parotiditis sin complicación", "Pediatría"],
  ["B34.9", "Infección viral no especificada", "Infecciosas"],
  ["B35.1", "Tiña de las uñas", "Dermatología"],
  ["B35.3", "Tiña del pie", "Dermatología"],
  ["B35.4", "Tiña del cuerpo", "Dermatología"],
  ["B37.3", "Candidiasis de la vulva y de la vagina", "Ginecología"],
  ["B86", "Escabiosis", "Dermatología"],
  ["U07.1", "COVID-19, virus identificado", "Infecciosas"],
  ["J11.1", "Influenza con otras manifestaciones respiratorias, virus no identificado", "Respiratorio"],
  ["J10.1", "Influenza con otras manifestaciones respiratorias, virus identificado", "Respiratorio"],
  ["J05.0", "Laringitis obstructiva aguda", "Pediatría"],
  ["J05.1", "Epiglotitis aguda", "Pediatría"],
  ["J21.0", "Bronquiolitis aguda por virus sincitial respiratorio", "Pediatría"],
  ["J21.9", "Bronquiolitis aguda no especificada", "Pediatría"],
  ["L01.0", "Impétigo", "Pediatría"],
  ["L21.0", "Costra láctea", "Pediatría"],
  ["E40", "Kwashiorkor", "Pediatría"],
  ["E41", "Marasmo nutricional", "Pediatría"],
  ["E43", "Desnutrición proteicocalórica grave no especificada", "Pediatría"],
  ["E46", "Desnutrición proteicocalórica no especificada", "Pediatría"],
  ["E45", "Retardo del desarrollo por desnutrición", "Pediatría"],
  ["E55.0", "Raquitismo activo", "Pediatría"],
  ["P22.0", "Síndrome de dificultad respiratoria del recién nacido", "Perinatal"],
  ["P36.9", "Sepsis bacteriana del recién nacido no especificada", "Perinatal"],
  ["P59.9", "Ictericia neonatal no especificada", "Perinatal"],
  ["N70.1", "Salpingitis y ooforitis crónica", "Ginecología"],
  ["N76.4", "Absceso de la vulva", "Ginecología"],
  ["N80.0", "Endometriosis del útero", "Ginecología"],
  ["N80.1", "Endometriosis del ovario", "Ginecología"],
  ["N80.9", "Endometriosis no especificada", "Ginecología"],
  ["N83.0", "Quiste folicular del ovario", "Ginecología"],
  ["N84.0", "Pólipo del cuerpo del útero", "Ginecología"],
  ["N87.0", "Displasia cervical leve", "Ginecología"],
  ["N87.1", "Displasia cervical moderada", "Ginecología"],
  ["N87.9", "Displasia del cuello uterino no especificada", "Ginecología"],
  ["N91.2", "Amenorrea no especificada", "Ginecología"],
  ["N92.0", "Menstruación excesiva y frecuente con ciclo regular", "Ginecología"],
  ["N92.1", "Menstruación excesiva e irregular", "Ginecología"],
  ["N93.9", "Hemorragia vaginal anormal no especificada", "Ginecología"],
  ["N94.4", "Dismenorrea primaria", "Ginecología"],
  ["N94.5", "Dismenorrea secundaria", "Ginecología"],
  ["N94.6", "Dismenorrea no especificada", "Ginecología"],
  ["N95.1", "Estados menopáusicos y climatéricos", "Ginecología"],
  ["N97.9", "Infertilidad femenina no especificada", "Ginecología"],
  ["O20.0", "Amenaza de aborto", "Obstetricia"],
  ["O21.0", "Hiperémesis gravídica leve", "Obstetricia"],
  ["O21.1", "Hiperémesis gravídica con trastorno metabólico", "Obstetricia"],
  ["O80", "Parto único espontáneo", "Obstetricia"],
  ["Z32.1", "Embarazo confirmado", "Obstetricia"],
  ["C16.9", "Tumor maligno del estómago, parte no especificada", "Oncología"],
  ["C18.9", "Tumor maligno del colon, parte no especificada", "Oncología"],
  ["C20", "Tumor maligno del recto", "Oncología"],
  ["C22.0", "Carcinoma de células hepáticas", "Oncología"],
  ["C25.9", "Tumor maligno del páncreas, parte no especificada", "Oncología"],
  ["C53.9", "Tumor maligno del cuello del útero no especificado", "Oncología"],
  ["C56", "Tumor maligno del ovario", "Oncología"],
  ["C61", "Tumor maligno de la próstata", "Oncología"],
  ["C64", "Tumor maligno del riñón, excepto pelvis renal", "Oncología"],
  ["C67.9", "Tumor maligno de la vejiga, parte no especificada", "Oncología"],
  ["C73", "Tumor maligno de la glándula tiroides", "Oncología"],
  ["C85.9", "Linfoma no Hodgkin no especificado", "Oncología"],
  ["C91.9", "Leucemia linfoide no especificada", "Oncología"],
  ["D24", "Tumor benigno de la mama", "Oncología"],
  ["D25.9", "Leiomioma del útero no especificado", "Ginecología"],
  ["D50.9", "Anemia por deficiencia de hierro no especificada", "Hematología"],
  ["D51.9", "Anemia por deficiencia de vitamina B12 no especificada", "Hematología"],
  ["D52.9", "Anemia por deficiencia de folatos no especificada", "Hematología"],
  ["D62", "Anemia posthemorrágica aguda", "Hematología"],
  ["D64.9", "Anemia no especificada", "Hematología"],
  ["D69.6", "Trombocitopenia no especificada", "Hematología"],
  ["R05", "Tos", "Síntomas y Signos"],
  ["R10.1", "Dolor abdominal superior", "Síntomas y Signos"],
  ["R10.4", "Dolor abdominal no especificado", "Síntomas y Signos"],
  ["R11", "Náusea y vómito", "Síntomas y Signos"],
  ["R30.0", "Disuria", "Síntomas y Signos"],
  ["R42", "Mareo y desvanecimiento", "Síntomas y Signos"],
  ["R50.9", "Fiebre no especificada", "Síntomas y Signos"],
  ["R51", "Cefalea", "Síntomas y Signos"],
  ["R63.4", "Pérdida anormal de peso", "Síntomas y Signos"],
  ["T90.5", "Secuelas de traumatismo intracraneal", "Traumatismos"],
  ["T92.1", "Secuelas de fractura del brazo", "Traumatismos"],
  ["T93.2", "Secuelas de otras fracturas del miembro inferior", "Traumatismos"],
  ["Z00.2", "Examen durante el período de crecimiento rápido en la infancia", "Pediatría"],
  ["Z00.3", "Examen del estado de desarrollo del adolescente", "Pediatría"],
  ["Z01.0", "Examen de ojos y de la visión", "Prevención"],
  ["Z01.1", "Examen de oídos y de la audición", "Prevención"],
  ["Z01.4", "Examen ginecológico", "Ginecología"],
  ["Z09", "Examen de seguimiento consecutivo a tratamiento", "Prevención"],
  ["Z13.9", "Cribado no especificado", "Prevención"],
  ["Z48.0", "Atención de vendajes y suturas", "Procedimientos"],
  ["Z51.0", "Sesión de radioterapia", "Procedimientos"],
  ["Z51.5", "Cuidados paliativos", "Procedimientos"],
  ["A08.0", "Enteritis debida a rotavirus", "Pediatría"],
  ["A08.4", "Infección intestinal viral no especificada", "Infecciosas"],
  ["A37.9", "Tos ferina no especificada", "Pediatría"],
  ["A38", "Escarlatina", "Pediatría"],
  ["A39.0", "Meningitis meningocócica", "Infecciosas"],
  ["A46", "Erisipela", "Dermatología"],
  ["A87.9", "Meningitis viral no especificada", "Neurología"],
  ["A97.0", "Dengue sin signos de alarma", "Infecciosas"],
  ["A97.1", "Dengue con signos de alarma", "Infecciosas"],
  ["A97.2", "Dengue grave", "Infecciosas"],
  ["B00.1", "Dermatitis vesicular herpética", "Dermatología"],
  ["B00.9", "Infección herpética no especificada", "Infecciosas"],
  ["B02.2", "Herpes zóster con compromiso neurológico", "Neurología"],
  ["B07", "Verrugas víricas", "Dermatología"],
  ["B08.1", "Molusco contagioso", "Dermatología"],
  ["B34.2", "Infección por coronavirus de sitio no especificado", "Infecciosas"],
  ["B36.0", "Pitiriasis versicolor", "Dermatología"],
  ["B37.0", "Estomatitis candidiásica", "Digestivo"],
  ["B77.9", "Ascariasis no especificada", "Infecciosas"],
  ["B82.9", "Parasitosis intestinal no especificada", "Infecciosas"],
  ["A06.9", "Amebiasis no especificada", "Infecciosas"],
  ["D48.6", "Tumor de comportamiento incierto de la mama", "Oncología"],
  ["E03.8", "Otros hipotiroidismos especificados", "Endocrino/Metabólico"],
  ["E04.1", "Bocio multinodular no tóxico", "Endocrino/Metabólico"],
  ["E04.2", "Bocio multinodular tóxico", "Endocrino/Metabólico"],
  ["E05.0", "Tirotoxicosis con bocio difuso", "Endocrino/Metabólico"],
  ["E06.3", "Tiroiditis autoinmune", "Endocrino/Metabólico"],
  ["E10.9", "Diabetes mellitus tipo 1 sin complicaciones", "Endocrino/Metabólico"],
  ["E66.0", "Obesidad debida a exceso de calorías", "Endocrino/Metabólico"],
  ["E66.2", "Obesidad extrema con hipoventilación alveolar", "Endocrino/Metabólico"],
  ["E78.0", "Hipercolesterolemia pura", "Endocrino/Metabólico"],
  ["E79.0", "Hiperuricemia sin signos de artritis inflamatoria", "Endocrino/Metabólico"],
  ["E86", "Depleción del volumen", "Endocrino/Metabólico"],
  ["E87.1", "Hiponatremia", "Endocrino/Metabólico"],
  ["F10.2", "Síndrome de dependencia del alcohol", "Salud Mental"],
  ["F17.2", "Síndrome de dependencia del tabaco", "Salud Mental"],
  ["F32.0", "Episodio depresivo leve", "Salud Mental"],
  ["F32.1", "Episodio depresivo moderado", "Salud Mental"],
  ["F32.2", "Episodio depresivo grave sin síntomas psicóticos", "Salud Mental"],
  ["F32.3", "Episodio depresivo grave con síntomas psicóticos", "Salud Mental"],
  ["F33.0", "Trastorno depresivo recurrente, episodio actual leve", "Salud Mental"],
  ["F33.1", "Trastorno depresivo recurrente, episodio actual moderado", "Salud Mental"],
  ["F33.2", "Trastorno depresivo recurrente, episodio actual grave", "Salud Mental"],
  ["F41.9", "Trastorno de ansiedad no especificado", "Salud Mental"],
  ["F43.2", "Trastorno de adaptación", "Salud Mental"],
  ["F51.9", "Trastorno no orgánico del sueño no especificado", "Salud Mental"],
  ["G03.9", "Meningitis no especificada", "Neurología"],
  ["G25.0", "Temblor esencial", "Neurología"],
  ["G47.2", "Trastorno del ciclo sueño-vigilia", "Neurología"],
  ["G47.3", "Apnea del sueño", "Neurología"],
  ["G47.9", "Trastorno del sueño no especificado", "Neurología"],
  ["G54.0", "Trastorno del plexo braquial", "Neurología"],
  ["H00.0", "Orzuelo", "Oftalmología"],
  ["H01.0", "Blefaritis", "Oftalmología"],
  ["H10.9", "Conjuntivitis no especificada", "Oftalmología"],
  ["H52.1", "Miopía", "Oftalmología"],
  ["H52.2", "Astigmatismo", "Oftalmología"],
  ["H52.4", "Presbicia", "Oftalmología"],
  ["H54.7", "Pérdida visual no especificada", "Oftalmología"],
  ["H65.0", "Otitis media serosa aguda", "Otorrinolaringología"],
  ["H65.9", "Otitis media no supurativa no especificada", "Otorrinolaringología"],
  ["H66.0", "Otitis media supurativa aguda", "Otorrinolaringología"],
  ["H66.9", "Otitis media no especificada", "Otorrinolaringología"],
  ["H81.0", "Enfermedad de Ménière", "Otorrinolaringología"],
  ["H81.1", "Vértigo paroxístico benigno", "Otorrinolaringología"],
  ["H81.3", "Otro vértigo periférico", "Otorrinolaringología"],
  ["I49.3", "Despolarización ventricular prematura", "Cardiovascular"],
  ["I80.2", "Tromboflebitis de vasos profundos de miembros inferiores", "Cardiovascular"],
  ["I83.0", "Várices de miembros inferiores con úlcera", "Cardiovascular"],
  ["I83.1", "Várices de miembros inferiores con inflamación", "Cardiovascular"],
  ["I84.0", "Hemorroides internas trombosadas", "Digestivo"],
  ["I84.1", "Hemorroides internas con otra complicación", "Digestivo"],
  ["I84.2", "Hemorroides internas sin complicación", "Digestivo"],
  ["I84.3", "Hemorroides externas trombosadas", "Digestivo"],
  ["I84.5", "Hemorroides externas sin complicación", "Digestivo"],
  ["I84.9", "Hemorroides no especificadas", "Digestivo"],
  ["I95.9", "Hipotensión no especificada", "Cardiovascular"],
  ["J01.0", "Sinusitis maxilar aguda", "Respiratorio"],
  ["J01.1", "Sinusitis frontal aguda", "Respiratorio"],
  ["J01.9", "Sinusitis aguda no especificada", "Respiratorio"],
  ["J02.0", "Faringitis estreptocócica", "Respiratorio"],
  ["J02.9", "Faringitis aguda no especificada", "Respiratorio"],
  ["J03.0", "Amigdalitis estreptocócica", "Respiratorio"],
  ["J03.9", "Amigdalitis aguda no especificada", "Respiratorio"],
  ["J04.0", "Laringitis aguda", "Respiratorio"],
  ["J04.2", "Laringotraqueítis aguda", "Respiratorio"],
  ["J12.1", "Neumonía debida a virus sincitial respiratorio", "Pediatría"],
  ["J18.2", "Neumonía hipostática no especificada", "Respiratorio"],
  ["J20.0", "Bronquitis aguda debida a Mycoplasma pneumoniae", "Respiratorio"],
  ["J20.5", "Bronquitis aguda debida a virus sincitial respiratorio", "Pediatría"],
  ["J20.9", "Bronquitis aguda no especificada", "Respiratorio"],
  ["J30.2", "Otra rinitis alérgica estacional", "Respiratorio"],
  ["J31.0", "Rinitis crónica", "Respiratorio"],
  ["J32.0", "Sinusitis maxilar crónica", "Respiratorio"],
  ["J32.4", "Pansinusitis crónica", "Respiratorio"],
  ["J33.0", "Pólipo de la cavidad nasal", "Otorrinolaringología"],
  ["J33.9", "Pólipo nasal no especificado", "Otorrinolaringología"],
  ["J34.2", "Desviación del tabique nasal", "Otorrinolaringología"],
  ["J35.0", "Amigdalitis crónica", "Otorrinolaringología"],
  ["J35.1", "Hipertrofia de las amígdalas", "Otorrinolaringología"],
  ["J35.3", "Hipertrofia de amígdalas y adenoides", "Otorrinolaringología"],
  ["J69.0", "Neumonitis por aspiración de alimento o vómito", "Respiratorio"],
  ["K04.0", "Pulpitis", "Digestivo"],
  ["K05.0", "Gingivitis aguda", "Digestivo"],
  ["K05.1", "Gingivitis crónica", "Digestivo"],
  ["K08.1", "Pérdida de dientes por extracción o enfermedad periodontal", "Digestivo"],
  ["K12.0", "Aftas orales recurrentes", "Digestivo"],
  ["K12.1", "Otras formas de estomatitis", "Digestivo"],
  ["K13.0", "Enfermedades de los labios", "Digestivo"],
  ["K29.3", "Gastritis crónica superficial", "Digestivo"],
  ["K29.4", "Gastritis crónica atrófica", "Digestivo"],
  ["K29.7", "Gastritis no especificada", "Digestivo"],
  ["K30", "Dispepsia", "Digestivo"],
  ["K40.9", "Hernia inguinal unilateral sin obstrucción ni gangrena", "Digestivo"],
  ["K42.9", "Hernia umbilical sin obstrucción ni gangrena", "Digestivo"],
  ["K44.9", "Hernia diafragmática sin obstrucción ni gangrena", "Digestivo"],
  ["K60.0", "Fisura anal aguda", "Digestivo"],
  ["K60.1", "Fisura anal crónica", "Digestivo"],
  ["K60.2", "Fisura anal no especificada", "Digestivo"],
  ["L03.0", "Celulitis de los dedos de la mano y del pie", "Dermatología"],
  ["L03.1", "Celulitis de otras partes de los miembros", "Dermatología"],
  ["L22", "Dermatitis del pañal", "Pediatría"],
  ["L30.0", "Dermatitis numular", "Dermatología"],
  ["L30.8", "Otras dermatitis especificadas", "Dermatología"],
  ["L60.0", "Uña encarnada", "Dermatología"],
  ["L72.0", "Quiste epidérmico", "Dermatología"],
  ["L82", "Queratosis seborreica", "Dermatología"],
  ["L84", "Callos y callosidades", "Dermatología"],
  ["L89.9", "Úlcera por presión no especificada", "Dermatología"],
  ["B35.6", "Tiña inguinal", "Dermatología"],
  ["M23.2", "Trastorno del menisco por desgarro o lesión antigua", "Musculoesquelético"],
  ["M47.8", "Otras espondilosis", "Musculoesquelético"],
  ["M48.0", "Estenosis espinal", "Musculoesquelético"],
  ["M50.1", "Trastorno de disco cervical con radiculopatía", "Musculoesquelético"],
  ["M54.6", "Dolor en la columna dorsal", "Musculoesquelético"],
  ["M65.4", "Tenosinovitis de estiloides radial", "Musculoesquelético"],
  ["M72.2", "Fascitis plantar", "Musculoesquelético"],
  ["M75.0", "Capsulitis adhesiva del hombro", "Musculoesquelético"],
  ["M75.2", "Tendinitis bicipital", "Musculoesquelético"],
  ["M77.0", "Epicondilitis medial", "Musculoesquelético"],
  ["M77.3", "Espolón calcáneo", "Musculoesquelético"],
  ["M79.2", "Neuralgia y neuritis no especificadas", "Musculoesquelético"],
  ["M79.6", "Dolor en un miembro", "Musculoesquelético"],
  ["N11.9", "Nefritis tubulointersticial crónica no especificada", "Genitourinario"],
  ["N12", "Nefritis tubulointersticial no especificada como aguda o crónica", "Genitourinario"],
  ["N17.9", "Insuficiencia renal aguda no especificada", "Genitourinario"],
  ["N19", "Insuficiencia renal no especificada", "Genitourinario"],
  ["N30.1", "Cistitis intersticial crónica", "Genitourinario"],
  ["N30.9", "Cistitis no especificada", "Genitourinario"],
  ["N41.2", "Absceso de la próstata", "Genitourinario"],
  ["N64.4", "Mastodinia", "Ginecología"],
  ["N72", "Enfermedad inflamatoria del cuello uterino", "Ginecología"],
  ["N76.0", "Vaginitis aguda", "Ginecología"],
  ["N76.1", "Vaginitis subaguda y crónica", "Ginecología"],
  ["N76.2", "Vulvitis aguda", "Ginecología"],
  ["N83.2", "Quiste ovárico no especificado", "Ginecología"],
  ["N89.8", "Otro trastorno no inflamatorio especificado de la vagina", "Ginecología"],
  ["N90.4", "Leucoplasia de la vulva", "Ginecología"],
  ["N92.4", "Hemorragia excesiva en el período premenopáusico", "Ginecología"],
  ["N92.6", "Menstruación irregular no especificada", "Ginecología"],
  ["N94.3", "Síndrome de tensión premenstrual", "Ginecología"],
  ["O13", "Hipertensión gestacional", "Obstetricia"],
  ["O14.9", "Preeclampsia no especificada", "Obstetricia"],
  ["O16", "Hipertensión materna no especificada", "Obstetricia"],
  ["O24.0", "Diabetes mellitus tipo 1 preexistente en el embarazo", "Obstetricia"],
  ["O24.4", "Diabetes mellitus que se origina en el embarazo", "Obstetricia"],
  ["O24.9", "Diabetes mellitus en el embarazo no especificada", "Obstetricia"],
  ["O47.0", "Falso trabajo de parto antes de las 37 semanas", "Obstetricia"],
  ["O60.0", "Trabajo de parto prematuro sin parto", "Obstetricia"],
  ["O82", "Parto único por cesárea", "Obstetricia"],
  ["O91.0", "Infección del pezón asociada con el parto", "Obstetricia"],
  ["O92.5", "Supresión de la lactancia", "Obstetricia"],
  ["P28.4", "Otra apnea del recién nacido", "Perinatal"],
  ["P92.9", "Problema de alimentación del recién nacido no especificado", "Perinatal"],
  ["R00.0", "Taquicardia no especificada", "Síntomas y Signos"],
  ["R00.2", "Palpitaciones", "Síntomas y Signos"],
  ["R04.0", "Epistaxis", "Síntomas y Signos"],
  ["R06.0", "Disnea", "Síntomas y Signos"],
  ["R06.2", "Sibilancias", "Síntomas y Signos"],
  ["R07.2", "Dolor precordial", "Síntomas y Signos"],
  ["R07.4", "Dolor torácico no especificado", "Síntomas y Signos"],
  ["R09.2", "Paro respiratorio", "Síntomas y Signos"],
  ["R52", "Dolor no clasificado en otra parte", "Síntomas y Signos"],
  ["R53", "Malestar y fatiga", "Síntomas y Signos"],
  ["R55", "Síncope y colapso", "Síntomas y Signos"],
  ["R60.0", "Edema localizado", "Síntomas y Signos"],
  ["R60.9", "Edema no especificado", "Síntomas y Signos"],
  ["R63.0", "Anorexia", "Síntomas y Signos"],
  ["R73.0", "Prueba de tolerancia a la glucosa anormal", "Endocrino/Metabólico"],
  ["R73.9", "Hiperglucemia no especificada", "Endocrino/Metabólico"],
  ["S62.3", "Fractura de otro hueso metacarpiano", "Traumatismos"],
  ["S62.6", "Fractura de otro dedo de la mano", "Traumatismos"],
  ["S82.5", "Fractura del maléolo interno", "Traumatismos"],
  ["S83.6", "Esguince de otras partes de la rodilla", "Traumatismos"],
  ["S93.4", "Esguince del tobillo", "Traumatismos"],
  ["U07.2", "COVID-19, virus no identificado", "Infecciosas"],
  ["Z00.1", "Control de salud de rutina del niño", "Pediatría"],
  ["Z12.1", "Examen de pesquisa para tumor del tracto intestinal", "Prevención"],
  ["Z12.3", "Examen de pesquisa para tumor de la mama", "Ginecología"],
  ["Z12.4", "Examen de pesquisa para tumor del cuello uterino", "Ginecología"],
  ["Z23", "Necesidad de inmunización contra una enfermedad bacteriana", "Prevención"],
  ["Z27.9", "Necesidad de inmunización contra combinaciones no especificadas", "Prevención"],
  ["Z30.0", "Consejo general sobre anticoncepción", "Ginecología"],
  ["Z30.2", "Esterilización", "Ginecología"],
  ["Z30.4", "Supervisión de dispositivos anticonceptivos", "Ginecología"],
  ["Z30.9", "Atención para la anticoncepción no especificada", "Ginecología"],
  ["Z33", "Estado de embarazo incidental", "Obstetricia"],
  ["Z34.0", "Supervisión de primer embarazo normal", "Obstetricia"],
  ["Z34.8", "Supervisión de otro embarazo normal", "Obstetricia"],
  ["Z34.9", "Supervisión de embarazo normal no especificado", "Obstetricia"],
  ["Z36", "Pesquisas prenatales", "Obstetricia"],
  ["Z39.1", "Atención de la madre lactante", "Obstetricia"],
  ["Z96.1", "Presencia de lente intraocular", "Oftalmología"],
  ["B08.3", "Eritema infeccioso", "Pediatría"],
  ["B08.5", "Faringitis vesicular enterovírica", "Pediatría"],
  ["B01.2", "Neumonía debida a varicela", "Pediatría"],
  ["L21.1", "Dermatitis seborreica infantil", "Pediatría"],
  ["J21.8", "Bronquiolitis aguda debida a otros virus especificados", "Pediatría"],
  ["E54", "Deficiencia de ácido ascórbico", "Pediatría"],
  ["E61.1", "Deficiencia de hierro", "Pediatría"],
  ["P59.0", "Ictericia neonatal asociada con parto prematuro", "Perinatal"],
  ["Q90.9", "Síndrome de Down no especificado", "Congénitas"],
  ["O03.4", "Aborto espontáneo incompleto sin complicación", "Obstetricia"],
  ["O03.9", "Aborto espontáneo completo o no especificado sin complicación", "Obstetricia"],
  ["O20.9", "Hemorragia precoz del embarazo no especificada", "Obstetricia"],
  ["F90.0", "Trastorno de la actividad y de la atención", "Pediatría"],
  ["F91.9", "Trastorno de la conducta no especificado", "Pediatría"],
  ["F41.8", "Otros trastornos de ansiedad especificados", "Salud Mental"],
  ["G43.8", "Otras migrañas", "Neurología"],
  ["M54.1", "Radiculopatía", "Musculoesquelético"],
  ["E55.9", "Deficiencia de vitamina D no especificada", "Endocrino/Metabólico"],
  ["E53.8", "Deficiencia de otras vitaminas del grupo B especificadas", "Endocrino/Metabólico"],
  ["H65.1", "Otra otitis media aguda no supurativa", "Otorrinolaringología"],
  ["N94.0", "Dolor intermenstrual", "Ginecología"],
  ["Z35.9", "Supervisión de embarazo de alto riesgo no especificado", "Obstetricia"],
];

function sistemaDe(codigo, sistema) {
  let base = SISTEMA[sistema] || sistema;
  if (base === "Oftalmología/ORL") {
    base = /^H[6-9]/.test(codigo) || codigo.startsWith("J38") ? "Otorrinolaringología" : "Oftalmología";
  }
  if (/^N(7[0-7]|8[0-9]|9[0-8])/.test(codigo)) return "Ginecología";
  if (/^I6/.test(codigo) || /^G4[0-7]/.test(codigo)) return "Neurología";
  return base;
}

function familia(descripcion, sistema) {
  let texto = descripcion
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(agud[oa]s?|cr[oó]nic[oa]s?|recurrente[s]?|recidivante[s]?|no especificad[oa]s?|inicial|leves?|moderad[oa]s?|graves?|sever[oa]s?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[—,]/)[0]
    .trim();
  if (texto.length > 46) texto = texto.slice(0, 46).replace(/\s+\S*$/, "");
  return texto || sistema;
}

function severidadDe(descripcion, codigo = "") {
  const texto = descripcion.toLowerCase();
  if (/\bgraves?\b|\bsever[oa]s?\b/.test(texto)) return "grave";
  if (/\bmoderad[oa]s?\b/.test(texto)) return "moderado";
  if (/\bleves?\b/.test(texto)) return "leve";
  const etapa = texto.match(/\betapa\s*([1-5])\b/);
  if (etapa) return `etapa ${etapa[1]}`;
  const estadio = texto.match(/\bestadio\s*(i{1,3}v?|[1-5])\b/);
  if (estadio) return `estadio ${estadio[1]}`;
  const grado = texto.match(/\bgrado\s*(i{1,3}v?|[1-4])\b/);
  if (grado) return `grado ${grado[1]}`;
  if (codigo.startsWith("N18.")) {
    const etapaRenal = codigo[4];
    if ("12345".includes(etapaRenal)) return `etapa ${etapaRenal}`;
  }
  if (/sin hemorr|sin complic|no complic/.test(texto)) return "sin complicación";
  if (/con complic/.test(texto)) return "con complicación";
  return "";
}

function bloque(codigo, letra, desde, hasta) {
  if (codigo[0] !== letra) return false;
  const numero = Number(codigo.slice(1, 3));
  return numero >= desde && numero <= hasta;
}

function familiaDe(codigo) {
  const serie = [
    ["A", 0, 9, "intestinal"],
    ["A", 15, 19, "tuberculosis"],
    ["A", 30, 49, "bacteriano"],
    ["A", 50, 64, "transmisión sexual"],
    ["A", 90, 99, "arbovirus"],
    ["B", 0, 9, "exantemático"],
    ["B", 15, 19, "hepatitis"],
    ["B", 20, 24, "vih"],
    ["B", 35, 49, "micótico"],
    ["B", 50, 64, "protozoario"],
    ["B", 65, 83, "helminto"],
    ["B", 85, 89, "ectoparásito"],
    ["C", 0, 14, "cabeza y cuello"],
    ["C", 15, 26, "digestivo"],
    ["C", 30, 39, "respiratorio"],
    ["C", 43, 44, "piel"],
    ["C", 50, 50, "mama"],
    ["C", 51, 58, "ginecológico"],
    ["C", 60, 63, "genital masculino"],
    ["C", 64, 68, "urinario"],
    ["C", 73, 75, "endocrino"],
    ["C", 81, 96, "hematológico"],
    ["D", 0, 9, "in situ"],
    ["D", 10, 36, "benigno"],
    ["D", 37, 48, "incierto"],
    ["D", 50, 53, "carencial"],
    ["D", 55, 59, "hemolítico"],
    ["D", 60, 64, "anemia"],
    ["D", 65, 69, "coagulación"],
    ["D", 70, 77, "leucocitario"],
    ["D", 80, 89, "inmunitario"],
    ["E", 0, 7, "tiroideo"],
    ["E", 10, 14, "diabetes"],
    ["E", 15, 16, "hipoglucemia"],
    ["E", 40, 46, "desnutrición"],
    ["E", 50, 64, "carencial"],
    ["E", 65, 68, "obesidad"],
    ["E", 70, 90, "metabólico"],
    ["F", 0, 9, "orgánico"],
    ["F", 10, 19, "por sustancia"],
    ["F", 20, 29, "psicótico"],
    ["F", 30, 39, "afectivo"],
    ["F", 40, 48, "ansioso"],
    ["F", 50, 50, "alimentario"],
    ["F", 51, 51, "sueño"],
    ["F", 60, 69, "personalidad"],
    ["F", 70, 79, "intelectual"],
    ["F", 80, 89, "desarrollo"],
    ["F", 90, 98, "infantil"],
    ["G", 0, 9, "meníngeo"],
    ["G", 20, 26, "extrapiramidal"],
    ["G", 30, 32, "degenerativo"],
    ["G", 35, 37, "desmielinizante"],
    ["G", 40, 41, "epiléptico"],
    ["G", 43, 44, "cefalea"],
    ["G", 45, 46, "cerebrovascular"],
    ["G", 47, 47, "sueño"],
    ["G", 50, 64, "neuropatía"],
    ["G", 70, 73, "neuromuscular"],
    ["G", 80, 83, "parálisis"],
    ["H", 0, 6, "párpado"],
    ["H", 10, 13, "conjuntival"],
    ["H", 15, 22, "corneal"],
    ["H", 25, 28, "cristalino"],
    ["H", 30, 36, "retina"],
    ["H", 40, 42, "glaucoma"],
    ["H", 43, 45, "vítreo"],
    ["H", 46, 48, "nervio óptico"],
    ["H", 49, 52, "refracción"],
    ["H", 53, 54, "visual"],
    ["H", 60, 62, "oído externo"],
    ["H", 65, 75, "oído medio"],
    ["H", 80, 83, "oído interno"],
    ["H", 90, 95, "audición"],
    ["I", 0, 2, "reumático"],
    ["I", 5, 9, "valvular"],
    ["I", 10, 15, "hipertensivo"],
    ["I", 20, 25, "isquémico"],
    ["I", 26, 28, "tromboembólico"],
    ["I", 30, 32, "pericárdico"],
    ["I", 33, 33, "endocárdico"],
    ["I", 34, 39, "valvular"],
    ["I", 40, 43, "miocárdico"],
    ["I", 44, 49, "arrítmico"],
    ["I", 50, 50, "insuficiencia cardíaca"],
    ["I", 60, 69, "cerebrovascular"],
    ["I", 70, 79, "arterial"],
    ["I", 80, 89, "venoso"],
    ["J", 0, 6, "vía aérea alta"],
    ["J", 9, 11, "influenza"],
    ["J", 12, 18, "neumonía"],
    ["J", 20, 22, "bronquial"],
    ["J", 30, 34, "rinosinusal"],
    ["J", 35, 39, "faríngeo"],
    ["J", 40, 42, "bronquitis crónica"],
    ["J", 43, 43, "enfisema"],
    ["J", 44, 44, "epoc"],
    ["J", 45, 46, "asmático"],
    ["J", 47, 47, "bronquiectasia"],
    ["J", 60, 84, "intersticial"],
    ["J", 90, 94, "pleural"],
    ["K", 0, 14, "oral"],
    ["K", 20, 23, "esofágico"],
    ["K", 25, 28, "ulceroso"],
    ["K", 29, 31, "gástrico"],
    ["K", 35, 38, "apendicular"],
    ["K", 40, 46, "herniario"],
    ["K", 50, 52, "inflamatorio intestinal"],
    ["K", 55, 64, "intestinal"],
    ["K", 65, 67, "peritoneal"],
    ["K", 70, 77, "hepático"],
    ["K", 80, 83, "biliar"],
    ["K", 85, 87, "pancreático"],
    ["K", 90, 93, "malabsorción"],
    ["L", 0, 8, "infeccioso cutáneo"],
    ["L", 10, 14, "ampolloso"],
    ["L", 20, 30, "dermatitis"],
    ["L", 40, 45, "papuloescamoso"],
    ["L", 50, 54, "urticaria"],
    ["L", 60, 75, "anexos cutáneos"],
    ["M", 0, 3, "artritis infecciosa"],
    ["M", 5, 14, "artritis inflamatoria"],
    ["M", 15, 19, "artrosis"],
    ["M", 20, 25, "articular"],
    ["M", 30, 36, "sistémico"],
    ["M", 40, 54, "columna"],
    ["M", 60, 63, "muscular"],
    ["M", 65, 68, "sinovial"],
    ["M", 70, 79, "partes blandas"],
    ["M", 80, 85, "óseo"],
    ["M", 86, 90, "osteomielitis"],
    ["N", 0, 8, "glomerular"],
    ["N", 10, 16, "túbulo-intersticial"],
    ["N", 17, 19, "renal"],
    ["N", 20, 23, "litiásico"],
    ["N", 25, 29, "renal"],
    ["N", 30, 39, "vesical"],
    ["N", 40, 51, "prostático"],
    ["N", 60, 64, "mamario"],
    ["N", 70, 77, "inflamatorio pélvico"],
    ["N", 80, 80, "endometriosis"],
    ["N", 81, 81, "prolapso"],
    ["N", 83, 83, "ovárico"],
    ["N", 84, 85, "uterino"],
    ["N", 86, 88, "cervical"],
    ["N", 89, 90, "vaginal"],
    ["N", 91, 94, "menstrual"],
    ["N", 95, 95, "menopausia"],
    ["N", 97, 97, "infertilidad"],
    ["O", 0, 8, "aborto"],
    ["O", 10, 16, "hipertensivo gestacional"],
    ["O", 20, 20, "hemorrágico"],
    ["O", 21, 21, "hiperémesis"],
    ["O", 24, 24, "diabetes gestacional"],
    ["O", 30, 48, "fetal"],
    ["O", 60, 75, "parto"],
    ["O", 80, 84, "parto"],
    ["O", 85, 92, "puerperal"],
    ["P", 5, 8, "crecimiento"],
    ["P", 20, 29, "respiratorio"],
    ["P", 35, 39, "infeccioso"],
    ["P", 50, 61, "hematológico"],
    ["P", 70, 74, "endocrino"],
    ["Q", 0, 7, "sistema nervioso"],
    ["Q", 20, 28, "cardiovascular"],
    ["Q", 35, 37, "fisura"],
    ["Q", 90, 99, "cromosómico"],
    ["R", 0, 9, "cardiorrespiratorio"],
    ["R", 10, 19, "digestivo"],
    ["R", 20, 23, "cutáneo"],
    ["R", 25, 29, "neurológico"],
    ["R", 30, 39, "urinario"],
    ["R", 40, 46, "cognitivo"],
    ["R", 50, 69, "general"],
    ["S", 0, 9, "cabeza"],
    ["S", 10, 19, "cuello"],
    ["S", 20, 29, "tórax"],
    ["S", 30, 39, "abdomen"],
    ["S", 40, 49, "hombro"],
    ["S", 50, 59, "antebrazo"],
    ["S", 60, 69, "mano"],
    ["S", 70, 79, "cadera"],
    ["S", 80, 89, "pierna"],
    ["S", 90, 99, "tobillo"],
    ["T", 15, 19, "cuerpo extraño"],
    ["T", 20, 32, "quemadura"],
    ["T", 36, 50, "intoxicación"],
    ["T", 51, 65, "tóxico"],
    ["T", 90, 98, "secuela"],
    ["Z", 0, 13, "examen"],
    ["Z", 20, 29, "exposición"],
    ["Z", 30, 39, "reproducción"],
    ["Z", 40, 54, "seguimiento"],
    ["Z", 80, 99, "antecedente"],
  ];
  for (const [letra, desde, hasta, nombre] of serie) {
    if (bloque(codigo, letra, desde, hasta)) return nombre;
  }
  return "";
}

function subtipoDe(codigo, descripcion) {
  const texto = descripcion.toLowerCase();
  if (/bacter|estreptoc|estafiloc|gonococ|bacilo|\bcoli\b|sepsis|imp[eé]tigo|mycoplasma/.test(texto)) return "bacteriano";
  if (codigo.startsWith("U07") || /covid/.test(texto)) return "covid";
  if (codigo.startsWith("A90") || codigo.startsWith("A91") || codigo.startsWith("A97") || /dengue/.test(texto)) return "dengue";
  if (/^A1[5-9]/.test(codigo) || /tubercul/.test(texto)) return "tuberculosis";
  if (/^B2[0-4]/.test(codigo) || /\bvih\b|sida/.test(texto)) return "vih";
  if (/^B1[5-9]/.test(codigo) || /hepatitis/.test(texto)) return "hepatitis";
  if (/^J(?:09|10|11)/.test(codigo) || /influenza|\bgripe\b/.test(texto)) return "influenza";
  if (/viral|virus|herpes|varicela|sarampi|parotid|sincitial/.test(texto)) return "viral";
  if (/tiña|candi|micosis|hongo|pitiriasis versicolor/.test(texto)) return "micótico";
  if (/par[aá]sit|tricomon|escab|sarna|ascar|ameb/.test(texto)) return "parasitario";
  if (/al[eé]rg|at[oó]pic/.test(texto) && !/no al[eé]rg/.test(texto)) return "alérgico";
  if (/nefropat/.test(texto)) return "nefropático";
  if (/retinopat/.test(texto)) return "retinopatía";
  if (/neuropat/.test(texto)) return "neuropático";
  if (/pie diab/.test(texto)) return "pie diabético";
  if (codigo.startsWith("I84") || /hemorroide/.test(texto)) return "hemorroides";
  if (!/sin hemorr/.test(texto) && /hemorr|sangr/.test(texto)) return "hemorrágico";
  if (/^J44/.test(codigo)) return "epoc";
  if (/^J4[56]/.test(codigo)) return "asmático";
  if (/obstruct/.test(texto) && !/sin obstruc/.test(texto)) return "obstructivo";
  const familia = familiaDe(codigo);
  if (familia) return familia;
  const letra = codigo[0];
  if (letra === "A" || letra === "B") return "infeccioso";
  if (letra === "C" || /^D[0-4]/.test(codigo)) return "neoplásico";
  if (letra === "E") return "metabólico";
  if (letra === "F") return "mental";
  if (letra === "G") return "neurológico";
  if (letra === "I") return "vascular";
  if (/^H[0-5]/.test(codigo)) return "oftalmológico";
  if (/^H[6-9]/.test(codigo)) return "otológico";
  if (letra === "J") return "respiratorio";
  if (letra === "K" || codigo.startsWith("I84")) return "digestivo";
  if (letra === "L") return "dermatológico";
  if (letra === "M") return "musculoesquelético";
  if (letra === "N") return "genitourinario";
  if (letra === "O") return "obstétrico";
  if (letra === "P") return "perinatal";
  if (letra === "Q") return "congénito";
  if (letra === "R") return "síntoma";
  if (letra === "S" || letra === "T") return "traumático";
  if (letra === "Z") return "preventivo";
  return "no especificado";
}

function tipoDe(codigo, descripcion) {
  const texto = descripcion.toLowerCase();
  const agudo = /\bagud/.test(texto);
  const cronico = /cr[oó]nic|permanente|persistente/.test(texto);
  if (agudo && cronico) return "agudo sobre crónico";
  if (/\brecurrent|\brecidiv/.test(texto) || codigo.startsWith("F33") || codigo.startsWith("G43") || codigo.startsWith("G44.2")) return "recurrente";
  if (agudo || /xxa$/i.test(codigo)) return "agudo";
  if (cronico || codigo.startsWith("T9") || codigo.startsWith("I69")) return "crónico";
  if (codigo.startsWith("R")) return "síntoma";
  if (codigo.startsWith("Z")) return "prevención";
  if (codigo.startsWith("Q") || codigo.startsWith("P")) return "congénito";
  if (codigo.startsWith("S") || /^T(?!9)/.test(codigo)) return "traumático";
  if (codigo.startsWith("C") || /^D[0-4]/.test(codigo)) return "neoplásico";
  if (/^E1[0-4]/.test(codigo) && /cetoacidosis|coma|hipogl/.test(texto)) return "agudo sobre crónico";
  if (codigo.startsWith("J44.0") || codigo.startsWith("J44.1")) return "agudo sobre crónico";
  if (codigo.startsWith("J46") || /^J0/.test(codigo) || /^J1/.test(codigo) || /^J2[0-2]/.test(codigo)) return "agudo";
  if (codigo.startsWith("J3") || codigo.startsWith("J4")) return "crónico";
  if (codigo.startsWith("A") || codigo.startsWith("B") || codigo.startsWith("U07")) {
    if (codigo.startsWith("B18") || /^B2[0-4]/.test(codigo) || /^A1[5-9]/.test(codigo)) return "crónico";
    return "agudo";
  }
  if (codigo.startsWith("O")) return "agudo";
  if (codigo.startsWith("I21") || codigo.startsWith("I22") || codigo.startsWith("I24") || codigo.startsWith("I26") || codigo.startsWith("I46") || codigo.startsWith("I63") || codigo === "I64" || codigo.startsWith("I20.0")) return "agudo";
  if (codigo.startsWith("F32") || codigo.startsWith("F43.0")) return "agudo";
  if (/^L0/.test(codigo) || codigo.startsWith("L50.0") || codigo.startsWith("L50.9")) return "agudo";
  if (codigo.startsWith("M00") || codigo.startsWith("K35") || codigo.startsWith("K65") || codigo.startsWith("K81.0") || codigo.startsWith("K85") || codigo.startsWith("N10") || codigo.startsWith("N00") || codigo.startsWith("N30.0") || codigo.startsWith("N41.0") || codigo.startsWith("H10.0") || codigo.startsWith("H10.1") || codigo.startsWith("H10.2") || codigo.startsWith("H10.3") || codigo.startsWith("G00") || codigo.startsWith("G03") || codigo.startsWith("G04") || codigo.startsWith("G45")) return "agudo";
  if (codigo.startsWith("D62")) return "agudo";
  if (codigo.startsWith("U09")) return "crónico";
  if ("DEFGHIJKLMN".includes(codigo[0])) return "crónico";
  return "otro";
}

function enriquecer(dx) {
  const descripcion = String(dx.descripcion || "").replace(/\s+/g, " ").trim();
  const sistema = sistemaDe(dx.codigo, dx.sistema);
  return {
    codigo: dx.codigo,
    descripcion,
    grupo: familia(descripcion, sistema),
    sistema,
    tipo: tipoDe(dx.codigo, descripcion),
    subtipo: subtipoDe(dx.codigo, descripcion),
    severidad: severidadDe(descripcion, dx.codigo),
  };
}

const vistos = new Set(cie10Data.map((dx) => dx.codigo));
const unidos = cie10Data.map(enriquecer);
let agregados = 0;
for (const [codigo, descripcion, sistema] of COMPLEMENTO) {
  if (vistos.has(codigo)) continue;
  vistos.add(codigo);
  unidos.push(enriquecer({ codigo, descripcion, sistema }));
  agregados += 1;
}
unidos.sort((a, b) => a.sistema.localeCompare(b.sistema, "es") || a.codigo.localeCompare(b.codigo, "es"));

const src = readFileSync(new URL("../catalogos.js", import.meta.url), "utf8");
const resto = src.slice(src.indexOf("export const medicamentosData"));
writeFileSync(new URL("../catalogos.js", import.meta.url), `export const cie10Data = ${JSON.stringify(unidos, null, 2)};\n\n${resto}`);

const porSistema = new Map();
const porTipo = new Map();
for (const dx of unidos) {
  porSistema.set(dx.sistema, (porSistema.get(dx.sistema) || 0) + 1);
  porTipo.set(dx.tipo, (porTipo.get(dx.tipo) || 0) + 1);
}
console.log("total", unidos.length, "agregados", agregados);
console.log("tipos", Object.fromEntries(porTipo));
console.log([...porSistema.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")).map(([s, n]) => `${s} ${n}`).join("\n"));
