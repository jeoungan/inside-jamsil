import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTicketSeat} from '../src/ticket-parser.js';
import {userSeatDestination} from '../src/route-input.js';

test('Korean ticket labels parse despite spacing, wrapping and full-width digits',()=>{
  for(const text of ['1루 블루석 207블록 8열 87번','２０７ 구 역\n８ 열\n８７ 번','구역: 207\n좌석 열: 8\n좌석번호: 87','207블럭 8열 87번']){
    assert.deepEqual(parseTicketSeat(text),{status:'complete',section:'207',row:'8',number:'87'});
  }
});
test('English labels and bounded OCR substitutions are accepted',()=>{
  assert.deepEqual(parseTicketSeat('SECTION: 207 ROW 8 SEAT NO. 87'),{status:'complete',section:'207',row:'8',number:'87'});
  assert.deepEqual(parseTicketSeat('2O7구역 I열 8I번'),{status:'complete',section:'207',row:'1',number:'81'});
});
test('ticket metadata and unlabelled numbers are never guessed as seats',()=>{
  assert.equal(parseTicketSeat('2026.11.17 18:30 잠실야구장 1루 GATE 207 예약번호 123456789 가격 25000원').status,'empty');
  assert.equal(parseTicketSeat('207 8 87').status,'empty');
  assert.equal(parseTicketSeat('예약번호: 87').status,'empty');
  assert.equal(parseTicketSeat('1207구역 123열 12345번').status,'empty');
});
test('multiple seats or conflicting values cannot be combined',()=>{
  for(const text of ['207블록 8열 87번\n207블록 8열 88번','207구역 8열\n217구역 87번']){
    assert.deepEqual(parseTicketSeat(text),{status:'ambiguous',section:'',row:'',number:''});
  }
});
test('partial reading leaves blanks and unsupported exact seats stay unsupported',()=>{
  assert.deepEqual(parseTicketSeat('207구역'),{status:'partial',section:'207',row:'',number:''});
  const seat=parseTicketSeat('207구역 8열 87번');
  assert.equal(userSeatDestination(seat.section,seat.row,seat.number).id,'seat:207:8:87');
  const unknown=parseTicketSeat('999구역 8열 87번');
  assert.equal(unknown.section,'999');assert.throws(()=>userSeatDestination(unknown.section,unknown.row,unknown.number));
  assert.throws(()=>userSeatDestination('',8,87),/구역마다 반복/);
});
