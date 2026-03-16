export const SPECIALTIES = [
  "Gastrointestinology",
  "Hepatology",
  "Cardiology",
  "Pulmonology & Critical care medicine",
  "Endocrinology",
  "Nephrology",
  "Hematology",
  "Oncology",
  "Infectious disease",
  "Allergy & Immunology",
  "Rheumatology",
  "Neurology & Neurosurgery",
  "Medical AI"
];

export const SUB_TOPICS: Record<string, string[]> = {
  "Gastrointestinology": ["IBD", "Upper GI bleeding", "Colon cancer screening", "GERD", "Motility disorders", "Pancreatobiliary"],
  "Hepatology": ["Viral hepatitis", "Cirrhosis complications", "HCC", "NAFLD/MASH", "Autoimmune liver diseases"],
  "Cardiology": ["Heart failure", "CAD/ACS", "Arrhythmia (AF)", "Valvular heart disease", "Hypertension", "Dyslipidemia"],
  "Pulmonology & Critical care medicine": ["COPD", "Asthma", "ILD", "Lung cancer", "Pulmonary hypertension", "ARDS", "Sepsis"],
  "Endocrinology": ["Diabetes mellitus", "Thyroid disorders", "Osteoporosis", "Pituitary/Adrenal", "Obesity"],
  "Nephrology": ["CKD", "AKI", "Glomerulonephritis", "Dialysis", "Electrolyte imbalances"],
  "Hematology": ["Leukemia", "Lymphoma", "Multiple Myeloma", "Anemia", "Coagulation disorders"],
  "Oncology": ["Breast cancer", "Lung cancer", "GI malignancies", "GU malignancies", "Targeted therapy", "Immunotherapy"],
  "Infectious disease": ["COVID-19", "HIV", "Antimicrobial resistance", "Tuberculosis", "Fungal infections", "Vaccines"],
  "Allergy & Immunology": ["Anaphylaxis", "Asthma", "Food allergy", "Immunodeficiency", "Urticaria"],
  "Rheumatology": ["Rheumatoid arthritis", "SLE", "Spondyloarthritis", "Vasculitis", "Osteoarthritis", "Gout"],
  "Neurology & Neurosurgery": ["Stroke", "Epilepsy", "Dementia", "Movement disorders", "Neuro-oncology", "Multiple Sclerosis"],
  "Medical AI": ["LLM in Healthcare", "Computer Vision in Radiology", "Predictive Analytics", "Digital Therapeutics", "Wearable Devices"]
};

export const JOURNALS = [
  "NEJM", "The Lancet", "JAMA", "Annals of Internal Medicine", "BMJ",
  "JCO", "Lancet Oncology", "Annals of Oncology", 
  "Circulation", "European Heart Journal", "JACC",
  "Gastroenterology", "Gut", "Hepatology", "Journal of Hepatology", 
  "Blood", "AJRCCM", "Chest", "Diabetes Care", 
  "Kidney International", "JASN", "CID", 
  "Arthritis & Rheumatology", "Annals of the Rheumatic Diseases",
  "Nature Medicine", "Science"
];

export const PUBMED_QUERIES: Record<string, string> = {
  "Gastrointestinology": '(IBD OR "Crohn disease" OR "ulcerative colitis" OR "GI bleeding" OR GERD OR pancreatitis OR "colorectal cancer") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Gastroenterology"[Journal] OR "Gut"[Journal] OR "Annals of Internal Medicine"[Journal] OR "BMJ"[Journal])',
  "Hepatology": '(cirrhosis OR "hepatocellular carcinoma" OR "viral hepatitis" OR NAFLD OR MASH OR "autoimmune hepatitis") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Hepatology"[Journal] OR "Journal of Hepatology"[Journal])',
  "Cardiology": '(heart failure OR "myocardial infarction" OR "atrial fibrillation" OR hypertension OR dyslipidemia OR "coronary artery disease") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Circulation"[Journal] OR "European Heart Journal"[Journal] OR "JACC"[Journal])',
  "Pulmonology & Critical care medicine": '(COPD OR asthma OR ILD OR "lung cancer" OR ARDS OR sepsis OR "pulmonary hypertension") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "AJRCCM"[Journal] OR "Chest"[Journal])',
  "Endocrinology": '(diabetes OR thyroid OR osteoporosis OR obesity OR "adrenal insufficiency" OR "pituitary") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Diabetes Care"[Journal])',
  "Nephrology": '(CKD OR "acute kidney injury" OR glomerulonephritis OR dialysis OR "electrolyte") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Kidney International"[Journal] OR "JASN"[Journal])',
  "Hematology": '(leukemia OR lymphoma OR myeloma OR anemia OR "coagulation disorder") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Blood"[Journal])',
  "Oncology": '("breast cancer" OR "lung cancer" OR "colorectal cancer" OR "targeted therapy" OR immunotherapy OR "CAR-T") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "JCO"[Journal] OR "Lancet Oncology"[Journal] OR "Annals of Oncology"[Journal])',
  "Infectious disease": '(COVID-19 OR HIV OR "antimicrobial resistance" OR tuberculosis OR "fungal infection" OR vaccine) AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "CID"[Journal])',
  "Allergy & Immunology": '(anaphylaxis OR asthma OR "food allergy" OR immunodeficiency OR urticaria) AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal])',
  "Rheumatology": '("rheumatoid arthritis" OR SLE OR vasculitis OR gout OR spondyloarthritis OR osteoarthritis) AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Arthritis & Rheumatology"[Journal] OR "Annals of the Rheumatic Diseases"[Journal] OR "Nature Medicine"[Journal] OR "BMJ"[Journal])',
  "Neurology & Neurosurgery": '(stroke OR epilepsy OR dementia OR "Parkinson disease" OR "multiple sclerosis" OR "brain tumor") AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal])',
  "Medical AI": '("artificial intelligence" OR "machine learning" OR "deep learning" OR LLM) AND (healthcare OR radiology OR diagnosis) AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal] OR "Nature Medicine"[Journal])'
};
