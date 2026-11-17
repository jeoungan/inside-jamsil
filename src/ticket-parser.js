// Only labelled seat fields are accepted. Dates, prices, gates and booking IDs
// must never become a destination just because they contain similar numbers.
export function parseTicketSeat(text) {
  const source=String(text??'').normalize('NFKC');
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
  // Multiple tickets or conflicting OCR values require another photo. Do not
  // assemble a fictional address from fields that might belong to other seats.
  if(Object.values(values).some(set=>set.size>1))return {status:'ambiguous',section:'',row:'',number:''};
  const address=Object.fromEntries(Object.entries(values).map(([field,set])=>[field,[...set][0]??'']));
  const count=Object.values(address).filter(Boolean).length;
  return {status:count===3?'complete':count?'partial':'empty',...address};
}
