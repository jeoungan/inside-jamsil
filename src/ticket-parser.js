// Only labelled seat fields are accepted. Dates, prices, gates and booking IDs
// must never become a destination just because they contain similar numbers.
export function parseTicketSeat(text) {
  // 블릭 is a common OCR rendering on photographed ticket screens. Correct
  // only a three-digit block followed by a labelled row on the same line.
  const source=String(text??'').normalize('NFKC')
    .replace(/(\d{3})[ \t]*블릭(?=[ \t]*\d{1,2}[ \t]*열)/g,'$1블럭')
    .replace(/(\d{3}[ \t]*(?:구역|블[록럭])[ \t]+\d{1,2}[ \t]*열[ \t]+\d{1,4})빈(?=[ \t]*(?:$|\n|\r))/g,'$1번');
  const digit='[0-9OoIl|]';
  const patterns={
    section:[`(?<![\\w])(${digit}{3})\\s*(?:구\\s*역|블\\s*[록럭]|BLOCK|SECTION)`, `(?:구\\s*역|블\\s*[록럭]|BLOCK|SECTION)\\s*[:：#-]?\\s*(${digit}{3})(?![\\w])`],
    row:[`(?<![\\w])(${digit}{1,2})\\s*열`, `(?:좌석\\s*열|ROW)\\s*[:：#-]?\\s*(${digit}{1,2})(?![\\w])`],
    number:[`(?<![\\w])(${digit}{1,4})\\s*번(?!\\s*호)`, `(?:좌석\\s*번호|SEAT(?:\\s*(?:NO\\.?|NUMBER))?)\\s*[:：#-]?\\s*(${digit}{1,4})(?![\\w])`],
  };
  const values={};
  for(const [field,expressions] of Object.entries(patterns)){
    values[field]=new Set();
    for(const [index,expression] of expressions.entries())for(const match of source.matchAll(new RegExp((index===1?'(?<![\\p{L}\\p{N}])':'')+expression,'giu'))){
      const number=Number(match[1].replace(/[Oo]/g,'0').replace(/[Il|]/g,'1'));
      if(number>0)values[field].add(String(number));
    }
  }
  // Some mobile tickets print "334블럭 6열 129" without 번. The complete
  // section/row context and end of line are required; a bare number isn't enough.
  for(const match of source.matchAll(/(?<!\d)\d{3}[ \t]*(?:구역|블[록럭])[ \t]+\d{1,2}[ \t]*열[ \t]+(\d{1,4})(?:[ \t]*(?:번|석))?[ \t]*(?=$|\n|\r)/g)){
    if(Number(match[1])>0)values.number.add(String(Number(match[1])));
  }
  // A second, incomplete row is still evidence of another seat. Do not choose
  // the sole fully readable ticket out of a photograph containing several.
  const rowMentions=[...source.matchAll(/(?:\d{1,2}[ \t]*)?열[ \t]+(\d{1,4})[ \t]*(?:번|석|(?=$|\n|\r))/g)].map(match=>String(Number(match[1])));
  if(new Set(rowMentions).size>1)return {status:'ambiguous',section:'',row:'',number:''};
  // Multiple tickets or conflicting OCR values require another photo. Do not
  // assemble a fictional address from fields that might belong to other seats.
  if(Object.values(values).some(set=>set.size>1))return {status:'ambiguous',section:'',row:'',number:''};
  const address=Object.fromEntries(Object.entries(values).map(([field,set])=>[field,[...set][0]??'']));
  const count=Object.values(address).filter(Boolean).length;
  return {status:count===3?'complete':count?'partial':'empty',...address};
}
