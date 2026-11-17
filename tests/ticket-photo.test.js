import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTicketSeat} from '../src/ticket-parser.js';
test('photographed mobile ticket with missing 번 and OCR 블릭 keeps the printed seat',()=>{
  for(const text of ['3루 네이비석 334블럭 6열 129','_3루네이비석 334블릭 6열 129\n50,000원(일반)'])assert.deepEqual(parseTicketSeat(text),{status:'complete',section:'334',row:'6',number:'129'});
});
test('a bare number after a row needs a complete same-line block address',()=>{
  assert.equal(parseTicketSeat('6열 129').number,'');
  assert.equal(parseTicketSeat('334블럭 6열 12900원').number,'');
  assert.equal(parseTicketSeat('334블럭 6열\n129').number,'');
});
test('incomplete second ticket is not replaced by the first readable one',()=>{
  assert.equal(parseTicketSeat('416블록 7열 110번\n외야그므 열 98번').status,'ambiguous');
  assert.equal(parseTicketSeat('416블록 7열 110번\n외야그므 열 98').status,'ambiguous');
});
test('photographed paper ticket OCR 빈 is corrected only in a full seat address',()=>{
  assert.deepEqual(parseTicketSeat('217블록 16열 237빈'),{status:'complete',section:'217',row:'16',number:'237'});
  assert.equal(parseTicketSeat('237빈').number,'');
});
