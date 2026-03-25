export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { issue, pathDesc } = req.body;
  if (!issue) return res.status(400).json({ error: 'issue required' });

  const SYS = `지정학·금융 애널리스트. 웹 검색 후 아래 JSON만 출력. 마크다운 코드블록 금지.

{
  "todayContext":"현황 1-2문장",
  "groupTitle":"경로 제목 15자 이내",
  "chain":[
    {"level":0,"title":"제목 20자 이내","source":"출처","summary":"설명 2문장 수치포함",
     "marketImpacts":[{"asset":"자산","direction":"up|down|neutral","reason":"이유 12자 이내"}],
     "watchPoint":"주목 1문장"}
  ]
}
chain 4개(level 0~3). marketImpacts 노드당 2~3개. KOSPI·원달러 반드시 포함.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        system: SYS,
        messages: [{ role: 'user', content: `이슈:"${issue}"\n${pathDesc}` }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });
    if (!response.ok) return res.status(500).json({ error: await response.text() });
    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: '파싱 실패', raw: text });
    res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}