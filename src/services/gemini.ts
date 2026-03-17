import { GoogleGenAI, Type } from "@google/genai";
import { Paper, UserPreferences, RelatedArticle } from "../types";
import { SUB_TOPICS, PUBMED_QUERIES } from "../constants";

function getAI() {
  // 1. 유저가 UI에서 직접 입력한 키 (우선순위 최고)
  const manualKey = typeof window !== 'undefined' ? localStorage.getItem('custom_gemini_api_key') : null;

  // 2. 로컬 개발환경 전용 fallback (.env의 GEMINI_API_KEY, 배포 환경에서는 설정하지 않음)
  const devKey = process.env.GEMINI_API_KEY ?? null;

  const apiKey = manualKey ?? devKey;

  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다. 서비스를 이용하려면 '개인 API 키 설정' 메뉴에서 Google Gemini API 키를 등록해야 합니다.");
  }
  return new GoogleGenAI({ apiKey });
}

async function searchPubMed(query: string, maxResults: number = 3): Promise<any[]> {
  try {
    const currentYear = new Date().getFullYear();
    const dateFilter = `AND ("${currentYear - 2}"[Date - Publication] : "${currentYear}"[Date - Publication])`;
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query + ' ' + dateFilter)}&retmax=${maxResults}&sort=relevance&retmode=json`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const ids: string[] = searchData.esearchresult?.idlist || [];
    
    if (ids.length === 0) return [];

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const fetchRes = await fetch(fetchUrl);
    const xmlText = await fetchRes.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const articles = xml.querySelectorAll('PubmedArticle');

    return Array.from(articles).map(article => {
      const title = article.querySelector('ArticleTitle')?.textContent || '';
      const journal = article.querySelector('ISOAbbreviation')?.textContent 
                   || article.querySelector('Title')?.textContent || '';
      const year = article.querySelector('PubDate Year')?.textContent || '';
      const month = article.querySelector('PubDate Month')?.textContent || '';
      const date = month ? `${month} ${year}` : year;
      const pmid = article.querySelector('PMID')?.textContent || '';
      const abstract = article.querySelector('AbstractText')?.textContent || '';

      return { title, journal, date, pmid, abstract,
               url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
    });

  } catch (error) {
    console.error('PubMed search failed:', error);
    return [];
  }
}

const MAX_RETRIES = 3;

async function withRetry<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isOverloaded = 
      error?.message?.includes("503") || 
      error?.message?.includes("high demand") ||
      error?.message?.includes("temporary") ||
      error?.status === 503;
      
    const isRateLimited = 
      error?.message?.includes("429") || 
      error?.status === "RESOURCE_EXHAUSTED" ||
      error?.status === 429;

    if ((isOverloaded || isRateLimited) && retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.log(`Service overloaded or rate limited. Retrying in ${Math.round(delay)}ms... (Attempt ${retryCount}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retryCount);
    }
    throw error;
  }
}

function extractCompleteObjects(jsonStr: string): any[] {
  const objects = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objStart = -1;

  const arrayStart = jsonStr.indexOf('"papers"');
  if (arrayStart === -1) return [];
  const bracketStart = jsonStr.indexOf('[', arrayStart);
  if (bracketStart === -1) return [];

  for (let i = bracketStart + 1; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (depth === 0) objStart = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && objStart !== -1) {
          const objStr = jsonStr.substring(objStart, i + 1);
          try {
            objects.push(JSON.parse(objStr));
          } catch (e) {
            // ignore
          }
          objStart = -1;
        }
      }
    }
  }
  return objects;
}

export async function fetchPapersForCategory(
  category: string, 
  keyword?: string,
  preferences?: UserPreferences,
  onUpdate?: (papers: Paper[]) => void,
  tab: 'suggestion' | 'new_journals' = 'suggestion'
) {
  const ai = getAI();
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.toLocaleString('en-US', { month: 'long' })} ${currentDate.getFullYear()}`;
  
  let prompt = `You are an expert medical AI assistant for a Korean Internal Medicine physician. The current date is ${currentMonthYear}.
IMPORTANT: You must ONLY recommend papers that actually exist and are indexed in PubMed. Never fabricate paper titles, authors, or journals. If you are not highly confident a paper exists, do not include it. `;

  if (category === "Subscriptions") {
    const subs = preferences?.subscriptions || [];
    if (subs.length > 0) {
      prompt += `\nThe user wants to see recent, high-impact clinical papers strictly related to their subscribed topics: ${subs.join(', ')}. Act as a highly targeted feed.`;
    } else {
      prompt += `\nThe user wants to see recent, high-impact clinical papers in Internal Medicine.`;
    }
  } else {
    const allCategoryTopics = SUB_TOPICS[category] ? SUB_TOPICS[category].join(', ') : '';
    prompt += `\nThe user wants to see recent, high-impact clinical papers strictly in the field of ${category}.
    
CRITICAL INSTRUCTION: All 3 papers MUST be strictly within the specialty of ${category}. Do NOT show general internal medicine papers (e.g., general obesity, diabetes, CKD, or heart failure) unless the paper's PRIMARY focus is a ${category} disease.
Focus on core ${category} topics${allCategoryTopics ? ` such as: ${allCategoryTopics}` : ''}.`;

    if (tab === 'suggestion') {
      prompt += `\n
Your secondary goal is to act like a broad medical newspaper WITHIN this specialty. Introduce serendipity and diverse topics within ${category}:
- If the user has preferred journals, give them about a 20% higher chance of appearing, but 80% should be from other top-tier journals.
- If the user has liked topics, give them a 10-15% higher chance, but mostly show diverse updates within ${category}.
- Related articles (the 2 recommendations) CAN cross specialties if relevant to the main paper's mechanism or side effects.`;
      
      if (preferences) {
        const subTopics = preferences.subTopics[category];
        if (subTopics && subTopics.length > 0) {
          prompt += `\nThe user is interested in these sub-topics: ${subTopics.join(', ')}. Include them occasionally, but maintain high diversity.`;
        }
      }
    } else if (tab === 'new_journals') {
      prompt += `\n
Your secondary goal is to act as an absolute latest publication feed. You MUST prioritize the MOST RECENT publications.
CRITICAL DATE REQUIREMENT: All papers MUST have been published within the last 3 months from today (${currentMonthYear}). DO NOT include papers from 2023, 2022, or earlier.
- IGNORE user preferences for serendipity or diversity.
- Focus strictly on breaking news, major clinical trials, and paradigm-shifting guidelines that were just published.
- The journals MUST be the highest impact factor journals for ${category} (e.g., NEJM, Lancet, JAMA, or the top specialty-specific journals).`;
    }
  }

  if (preferences && category !== "Subscriptions" && tab === 'suggestion') {
    if (preferences.journals && preferences.journals.length > 0) {
      prompt += `\nPreferred journals (20% weight): ${preferences.journals.join(', ')}.`;
    }

    const weights = preferences.topicWeights || {};
    const likedTopics = Object.entries(weights)
      .filter(([_, weight]) => weight > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
      
    if (likedTopics.length > 0) {
      prompt += `\nRecently liked keywords (10-15% weight): ${likedTopics.join(', ')}.`;
    }
  }

  if (keyword) {
    prompt += `\nSpecifically, focus on the keyword: ${keyword}.`;
  }

  prompt += `
Generate a list of exactly 3 highly relevant, recent papers.
For each paper, provide:
- id: A unique string ID.
- title: The title of the paper (in English).
- journal: The journal name.
- date: Publication date (e.g., "May 2024").
- keywords: 2-4 keywords starting with # (e.g., "#Breast_cancer", "#HER2-low").
- shortSummary: A 3-line summary of the key clinical points. MUST separate each point with a newline character (\\n). Write this in Korean, mixing English medical terms naturally.
- isVisual: Boolean. Set to true ONLY IF the paper's topic is highly visual (e.g., imaging, surgery, anatomy, devices). Otherwise false.
- url: Use the exact PubMed URL provided in the paper context above (format: https://pubmed.ncbi.nlm.nih.gov/PMID/). Do NOT use Google Scholar links. Do NOT construct URLs from titles.

CRITICAL RULES:
- Only recommend papers you are highly confident actually exist.
- If unsure whether a paper exists, do NOT include it.
- Never fabricate or combine real author names with fake titles.
- Every paper MUST be verifiable on PubMed.

Ensure the content is medically accurate, highly relevant to a practicing specialist, and reflects the latest guidelines or paradigm shifts.`;

  async function executeRequest(): Promise<Paper[]> {
    return withRetry(async () => {

      const pubmedQuery = keyword
        ? `${keyword} AND (${PUBMED_QUERIES[category] || category})`
        : PUBMED_QUERIES[category] || `${category} AND ("N Engl J Med"[Journal] OR "Lancet"[Journal] OR "JAMA"[Journal])`;

      const pubmedPapers = await searchPubMed(pubmedQuery, 8);

      let finalPrompt = prompt;

      // PubMed 결과를 즉시 화면에 표시 (요약 없이 제목/저널/날짜만)
      if (pubmedPapers.length > 0 && onUpdate) {
        const skeletonPapers: Paper[] = pubmedPapers.slice(0, 3).map((p, i) => ({
          id: `pubmed-${p.pmid}`,
          title: p.title,
          journal: p.journal,
          date: p.date,
          keywords: [],
          shortSummary: "AI가 요약을 생성 중입니다...",
          url: p.url,
        }));
        onUpdate(skeletonPapers);
      }

      if (pubmedPapers.length > 0) {
        const paperContext = pubmedPapers.map((p, i) =>
          `Paper ${i + 1}:
Title: ${p.title}
Journal: ${p.journal}
Date: ${p.date}
PMID: ${p.pmid}
URL: ${p.url}
Abstract: ${p.abstract ? p.abstract.slice(0, 300) + '...' : 'Not available'}`
        ).join('\n\n');

        finalPrompt = prompt + `

CRITICAL: Use ONLY the following real papers from PubMed. 
Do NOT invent or modify titles. Use the exact title, journal, date, and URL provided.
Select the 3 most relevant papers from the list below:

${paperContext}`;
      }

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-flash-latest",
        contents: finalPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              papers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    journal: { type: Type.STRING },
                    date: { type: Type.STRING },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    shortSummary: { type: Type.STRING },
                    isVisual: { type: Type.BOOLEAN },
                    url: { type: Type.STRING },
                  },
                  required: ["id", "title", "journal", "date", "keywords", "shortSummary", "url"]
                }
              }
            }
          }
        }
      });

      let accumulated = '';
      let parsedPapers: Paper[] = [];

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          accumulated += text;
          const papers = extractCompleteObjects(accumulated);
          if (papers.length > parsedPapers.length) {
            parsedPapers = papers as Paper[];
            if (onUpdate) onUpdate(parsedPapers);
          }
        }
      }

      try {
        const finalJson = JSON.parse(accumulated);
        if (finalJson.papers) {
          parsedPapers = finalJson.papers as Paper[];
          if (onUpdate) onUpdate(parsedPapers);
        }
      } catch (e) {
        console.error("Failed to parse final JSON", e);
      }

      if (pubmedPapers.length > 0) {
        parsedPapers = parsedPapers.map(paper => {
          const matched = pubmedPapers.find(p =>
            p.title.toLowerCase().includes(paper.title.toLowerCase().slice(0, 30)) ||
            paper.title.toLowerCase().includes(p.title.toLowerCase().slice(0, 30))
          );
          if (matched) {
            return { ...paper, title: matched.title, url: matched.url };
          }
          return paper;
        });
      }

      return parsedPapers;
    });
  }

  const TIMEOUT_MS = 35000;
  let hasPapers = false;

  const originalOnUpdate = onUpdate;
  onUpdate = (papers: Paper[]) => {
    if (papers.length > 0) hasPapers = true;
    if (originalOnUpdate) originalOnUpdate(papers);
  };

  return new Promise<Paper[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!hasPapers) {
        reject(new Error("요청 시간이 초과되었습니다. 새로고침을 눌러 다시 시도해주세요."));
      }
    }, TIMEOUT_MS);

    executeRequest()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Lite data layer (PubMed only, no AI) ────────────────────────────────────

/**
 * Fast paper list using PubMed only — zero AI calls.
 * Cards display the raw abstract as fallback headline/preview.
 */
export async function fetchLitePapersForCategory(
  category: string,
  keyword?: string,
  preferences?: UserPreferences,
  tab: 'suggestion' | 'new_journals' = 'suggestion',
  maxResults = 6,
): Promise<Paper[]> {
  const currentYear = new Date().getFullYear();

  let baseQuery: string;
  if (category === 'Subscriptions') {
    const subs = preferences?.subscriptions ?? [];
    baseQuery = keyword
      ? keyword
      : subs.length > 0
        ? subs.slice(0, 3).join(' OR ')
        : 'internal medicine randomized controlled trial';
  } else {
    baseQuery = PUBMED_QUERIES[category] || `${category}[MeSH Terms]`;
    if (keyword) baseQuery = `${keyword} AND (${baseQuery})`;
    if (tab === 'new_journals') {
      baseQuery += ` AND ("${currentYear}"[Date - Publication] : "${currentYear}"[Date - Publication])`;
    }
  }

  try {
    const results = await searchPubMed(baseQuery, maxResults);
    return results.map(p => ({
      id: `pubmed-${p.pmid}`,
      title: p.title,
      journal: p.journal,
      date: p.date,
      keywords: [],
      shortSummary: '',        // empty — AI generates on demand in PaperModal
      abstract: p.abstract,
      url: p.url,
    }));
  } catch {
    return [];
  }
}

// ─── On-demand AI summarisation ──────────────────────────────────────────────

/**
 * Generate shortSummary + detailedSummary + keywords + relatedArticles for a
 * single lite paper.  Called the first time a user opens a paper in PaperModal.
 */
export async function generatePaperSummaries(paper: Paper): Promise<{
  shortSummary: string;
  detailedSummary: string;
  keywords: string[];
  relatedArticles: RelatedArticle[];
}> {
  const ai = getAI();

  const context = paper.abstract
    ? `Abstract: ${paper.abstract}`
    : `Title: ${paper.title}\nJournal: ${paper.journal}`;

  const prompt = `You are an expert medical AI assistant for a Korean Internal Medicine physician.
Analyze the following paper and generate concise, clinically useful summaries.

Title: ${paper.title}
Journal: ${paper.journal}
Date: ${paper.date}
${context}

Generate:
1. shortSummary: 3 key clinical bullet points in Korean, separated by \\n. Mix English medical terms naturally.
2. detailedSummary: Abstract-level Korean summary with background, key findings, and clinical takeaway. Add \\n between sections.
3. keywords: 2–4 keywords starting with # (e.g. "#HFrEF", "#SGLT2_inhibitor").
4. relatedSearchTerms: 2 specific PubMed search queries (3–5 medical terms each) to find related papers.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shortSummary:       { type: Type.STRING },
            detailedSummary:    { type: Type.STRING },
            keywords:           { type: Type.ARRAY, items: { type: Type.STRING } },
            relatedSearchTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['shortSummary', 'detailedSummary', 'keywords', 'relatedSearchTerms'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('No response from Gemini');
    const result = JSON.parse(text);

    // Fetch related articles from PubMed
    const relatedArticles: RelatedArticle[] = [];
    await Promise.all(
      (result.relatedSearchTerms as string[]).map(async (term: string) => {
        const hits = await searchPubMed(term, 3);
        const filtered = hits.filter(p =>
          p.title.toLowerCase() !== paper.title.toLowerCase() && p.pmid
        );
        if (filtered.length > 0) {
          const p = filtered[0];
          relatedArticles.push({
            title: p.title,
            type: 'Related Paper',
            journal: p.journal,
            shortDescription: p.abstract
              ? p.abstract.slice(0, 150) + '...'
              : `${p.journal}에 게재된 관련 논문입니다.`,
            pmid: p.pmid,
            url: p.url,
          });
        }
      })
    );

    return {
      shortSummary:    result.shortSummary,
      detailedSummary: result.detailedSummary,
      keywords:        result.keywords,
      relatedArticles: relatedArticles.slice(0, 2),
    };
  });
}

// ─── Legacy AI-heavy list fetch (kept for backward compat) ───────────────────

export async function askQuestionAboutPaper(paper: Paper, question: string): Promise<{ answer: string, foundInPaper: boolean }> {
  const ai = getAI();
  const prompt = `You are an expert medical AI assistant. The user (a physician) is reading the following paper summary:
Title: ${paper.title}
Journal: ${paper.journal}
Summary: ${paper.detailedSummary || paper.shortSummary}

The user asks: "${question}"

First, determine if the answer can be found or reasonably inferred from the provided summary.
If it can be found, answer the question based ONLY on the provided paper context.
If it cannot be found, state: "해당 논문의 요약본에서는 이 질문에 대한 정확한 답을 찾을 수 없습니다."

Provide your response in JSON format:
{
  "foundInPaper": boolean, // true if the answer is in the summary, false otherwise
  "answer": string // your answer in professional Korean, mixing English medical terms naturally. Keep it concise.
}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foundInPaper: { type: Type.BOOLEAN },
            answer: { type: Type.STRING }
          },
          required: ["foundInPaper", "answer"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);
  });
}

export async function askQuestionWithSearch(paper: Paper, question: string): Promise<string> {
  const ai = getAI();
  const prompt = `You are an expert medical AI assistant. The user (a physician) is asking a question related to the following paper:
Title: ${paper.title}
Journal: ${paper.journal}

The user asks: "${question}"

Use the Google Search tool to find the most up-to-date and accurate medical information to answer this question.
Answer in professional Korean, mixing English medical terms naturally. Keep it concise and cite your sources if possible.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    return response.text || "답변을 생성하지 못했습니다.";
  });
}

export async function fetchPaperDetails(paper: Paper): Promise<{detailedSummary: string, relatedArticles: RelatedArticle[]}> {
  const ai = getAI();

  const summaryPrompt = `You are an expert medical AI assistant. The user wants detailed information about the following paper:
Title: ${paper.title}
Journal: ${paper.journal}
Short Summary: ${paper.shortSummary}

Provide:
1. detailedSummary: An abstract-level summary in Korean. For original articles, start with background/rationale. MUST add \\n between background and main summary.
2. relatedSearchTerms: 2 specific PubMed search queries to find related papers. Each query should be 3-5 specific medical terms (e.g., "nintedanib progressive fibrosing ILD", "ANCA vasculitis rituximab RCT"). Do NOT include journal names in the search terms.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: summaryPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detailedSummary: { type: Type.STRING },
            relatedSearchTerms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["detailedSummary", "relatedSearchTerms"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    const result = JSON.parse(text);

    // PubMed에서 실제 논문 검색 후 PMID 기반으로 관련 논문 구성
    const relatedArticles: RelatedArticle[] = [];

    await Promise.all(
      (result.relatedSearchTerms as string[]).map(async (searchTerm: string) => {
        const pubmedResults = await searchPubMed(searchTerm, 3);
        const filtered = pubmedResults.filter(p =>
          p.title.toLowerCase() !== paper.title.toLowerCase() &&
          p.pmid
        );
        if (filtered.length > 0) {
          const p = filtered[0];
          relatedArticles.push({
            title: p.title,
            type: 'Related Paper',
            journal: p.journal,
            shortDescription: p.abstract
              ? p.abstract.slice(0, 150) + '...'
              : `${p.journal}에 게재된 관련 논문입니다.`,
            pmid: p.pmid,
            url: p.url,
          });
          console.log('Related article PMID:', p.pmid, 'Title:', p.title);
        }
      })
    );

    return {
      detailedSummary: result.detailedSummary,
      relatedArticles: relatedArticles.slice(0, 2),
    };
  });
}

export async function fetchSpecificPaperDetails(article: RelatedArticle): Promise<Paper> {
  const ai = getAI();

  // PMID가 있으면 바로 가져오고, 없으면 제목으로 검색
  let matched: any = null;

  if (article.pmid) {
    // PMID로 직접 efetch 호출 (검색 없이 바로 가져옴)
    try {
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${article.pmid}&retmode=xml`;
      const fetchRes = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
      const xmlText = await fetchRes.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');
      const articles = xml.querySelectorAll('PubmedArticle');
      if (articles.length > 0) {
        const a = articles[0];
        const title = a.querySelector('ArticleTitle')?.textContent || '';
        const journal = a.querySelector('ISOAbbreviation')?.textContent || a.querySelector('Title')?.textContent || '';
        const year = a.querySelector('PubDate Year')?.textContent || '';
        const month = a.querySelector('PubDate Month')?.textContent || '';
        const date = month ? `${month} ${year}` : year;
        const abstract = a.querySelector('AbstractText')?.textContent || '';
        matched = { title, journal, date, pmid: article.pmid, abstract, url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` };
        console.log('PMID direct fetch:', article.pmid, 'Title:', title);
      }
    } catch (e) {
      console.error('PMID direct fetch failed:', e);
    }
  }

  if (!matched) {
    const pubmedResults = await searchPubMed(`"${article.title}"`, 1);
    if (pubmedResults.length > 0) {
      matched = pubmedResults[0];
    }
  }

  if (!matched && article.title) {
    const fallbackQuery = article.title.split(' ')
      .filter(w => !['for','the','of','in','a','an','with','and','or','to','at','by','from'].includes(w.toLowerCase()))
      .slice(0, 6)
      .join(' ');
    const pubmedResults = await searchPubMed(fallbackQuery, 2);
    if (pubmedResults.length > 0) {
      matched = pubmedResults[0];
    }
  }

  const prompt = `You are an expert medical AI assistant. The user clicked on a related article and wants to see its full details.
Title: ${matched ? matched.title : article.title}
Journal: ${matched ? matched.journal : article.journal}
Type: ${article.type}
${matched?.abstract ? `Abstract: ${matched.abstract}` : `Description: ${article.shortDescription}`}

Generate the full details for this specific paper.
Provide:
- id: A unique string ID.
- title: Use the EXACT title provided above. Do NOT modify it.
- journal: Use the EXACT journal name provided above.
- date: ${matched?.date || 'Estimated publication date'}.
- keywords: 2-4 keywords starting with #.
- shortSummary: A 3-line summary of key clinical points in Korean. MUST separate each point with a newline character (\\n).
- detailedSummary: An abstract-level summary in Korean. For original articles, start with background/rationale. MUST add \\n between background and main summary.
- isVisual: Boolean. Set to true ONLY IF the paper's topic is highly visual.
- url: ${matched?.url || `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(article.title)}`}
- relatedArticles: 2 new related articles for further reading.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            paper: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                journal: { type: Type.STRING },
                date: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                shortSummary: { type: Type.STRING },
                detailedSummary: { type: Type.STRING },
                isVisual: { type: Type.BOOLEAN },
                url: { type: Type.STRING },
                relatedArticles: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      type: { type: Type.STRING },
                      journal: { type: Type.STRING },
                      shortDescription: { type: Type.STRING }
                    },
                    required: ["title", "type", "journal", "shortDescription"]
                  }
                }
              },
              required: ["id", "title", "journal", "date", "keywords", "shortSummary", "detailedSummary", "isVisual", "url", "relatedArticles"]
            }
          },
          required: ["paper"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    const result = JSON.parse(text).paper;

    // PubMed 정보로 제목/URL/저널 강제 교체
    if (matched) {
      result.title = matched.title;
      result.url = matched.url;
      result.journal = matched.journal;
      if (matched.date) result.date = matched.date;
    }

    return result;
  });
}
