import test from 'node:test';
import assert from 'node:assert/strict';
import { Truco, criarBaralho, forca, vencedorVaza, vencedorMao } from '../src/truco.js';
const carta=(valor,naipe='ouros')=>({valor,naipe});
const vaza=(valores)=>valores.map((valor,jogador)=>({jogador,carta:carta(valor)}));

test('CT01 - baralho limpo tem 40 cartas e exclui 8, 9 e 10', () => {
  const d=criarBaralho(); assert.equal(d.length,40);
  assert.equal(new Set(d.map(c=>c.valor+c.naipe)).size,40);
  assert.ok(d.every(c=>!['8','9','10'].includes(c.valor)));
});
test('CT02 - ordem normal vai de 4 ate 3', () => {
  assert.ok(forca(carta('3'),carta('5'))>forca(carta('2'),carta('5')));
  assert.ok(forca(carta('A'),carta('5'))>forca(carta('K'),carta('5')));
});
test('CT03 - manilha e o valor seguinte ao vira, com volta de 3 para 4', () => {
  assert.ok(forca(carta('4'),carta('3'))>forca(carta('3'),carta('3')));
  assert.ok(forca(carta('5'),carta('4'))>forca(carta('3'),carta('4')));
});
test('CT04 - naipes das manilhas: ouros, espadas, copas e paus', () => {
  const f=['ouros','espadas','copas','paus'].map(n=>forca(carta('5',n),carta('4')));
  assert.ok(f[0]<f[1] && f[1]<f[2] && f[2]<f[3]);
});
test('CT05 - carta ou vaza invalida e rejeitada', () => {
  assert.throws(()=>forca(carta('8'),carta('4')),RangeError);
  assert.throws(()=>forca(carta('4','joker'),carta('4')),RangeError);
  assert.throws(()=>vencedorVaza([],carta('4')),RangeError);
});
test('CT06 - maior carta vence, empate adversario amarra, empate parceiro vence dupla', () => {
  assert.equal(vencedorVaza(vaza(['4','3','Q','J']),carta('5')),1);
  assert.equal(vencedorVaza(vaza(['3','3','Q','J']),carta('5')),null);
  assert.equal(vencedorVaza(vaza(['3','4','3','J']),carta('5')),0);
});
test('CT07 - duas vazas vencidas encerram a mao', () => {
  assert.equal(vencedorMao([0,0],0),0);
  assert.equal(vencedorMao([1,0,1],0),1);
  assert.equal(vencedorMao([0,1],0),null);
});
test('CT08 - regras de desempate das vazas', () => {
  assert.equal(vencedorMao([null,1],0),1);
  assert.equal(vencedorMao([0,null],1),0);
  assert.equal(vencedorMao([0,1,null],1),0);
  assert.equal(vencedorMao([null,null,1],0),1);
  assert.equal(vencedorMao([null,null,null],1),1);
  assert.throws(()=>vencedorMao([2],0),RangeError);
});
test('CT09 - distribui tres cartas para quatro jogadores e um vira', () => {
  const j=new Truco();j.iniciarMao();
  assert.deepEqual(j.estado.maos.map(m=>m.length),[3,3,3,3]);
  assert.ok(j.estado.vira);assert.equal(j.estado.valor,1);
});
test('CT10 - rejeita distribuicao repetida e inicio durante mao aberta', () => {
  const d=criarBaralho();d[1]=d[0];
  assert.throws(()=>new Truco().iniciarMao(d),RangeError);
  const j=new Truco();j.iniciarMao();assert.throws(()=>j.iniciarMao());
});
test('CT11 - exige turno correto e carta disponivel sem alterar a mao', () => {
  const j=new Truco();assert.throws(()=>j.jogar(0,0));j.iniciarMao();
  const antes=j.estado;assert.throws(()=>j.jogar(1,0));
  assert.throws(()=>j.jogar(0,3),RangeError);assert.deepEqual(j.estado,antes);
  j.jogar(0,0);assert.equal(j.estado.vez,1);assert.equal(j.estado.maos[0].length,2);
});
test('CT12 - aceitar truco eleva o valor para tres e preserva o turno', () => {
  const j=new Truco();j.iniciarMao();j.pedirTruco(0);
  assert.throws(()=>j.jogar(0,0));assert.throws(()=>j.responderTruco(0,true));
  j.responderTruco(1,true);
  assert.equal(j.estado.valor,3);assert.equal(j.estado.vez,0);
  assert.throws(()=>j.pedirTruco(0));
});
test('CT13 - recusar truco da um ponto a dupla solicitante', () => {
  const j=new Truco();j.iniciarMao();j.pedirTruco(0);j.responderTruco(1,false);
  assert.deepEqual(j.estado.pontos,[1,0]);assert.equal(j.estado.aberta,false);
});
test('CT14 - escalada aceita segue 3, 6, 9 e 12; recusa paga valor anterior', () => {
  const j=new Truco();j.iniciarMao();
  j.pedirTruco(0);j.responderTruco(1,true);j.jogar(0,0);
  j.pedirTruco(1);j.responderTruco(0,true);assert.equal(j.estado.valor,6);j.jogar(1,0);
  j.pedirTruco(2);j.responderTruco(1,true);assert.equal(j.estado.valor,9);j.jogar(2,0);
  j.pedirTruco(3);j.responderTruco(0,true);assert.equal(j.estado.valor,12);
  assert.throws(()=>j.pedirTruco(3));
  const k=new Truco();k.iniciarMao();k.pedirTruco(0);k.responderTruco(1,true);k.jogar(0,0);
  k.pedirTruco(1);k.responderTruco(0,false);assert.deepEqual(k.estado.pontos,[0,3]);
});
test('CT15 - mao de onze exige decisao e vale tres quando aceita', () => {
  const j=new Truco([11,0]);j.iniciarMao();
  assert.throws(()=>j.jogar(0,0));assert.throws(()=>j.decidirMao11(1,true));
  j.decidirMao11(0,true);assert.equal(j.estado.valor,3);assert.throws(()=>j.pedirTruco(0));
});
test('CT16 - recusar mao de onze concede um ponto ao adversario', () => {
  const j=new Truco([11,5]);j.iniciarMao();j.decidirMao11(0,false);
  assert.deepEqual(j.estado.pontos,[11,6]);assert.equal(j.estado.aberta,false);
});
test('CT17 - partida completa termina ao atingir doze pontos', () => {
  const j=new Truco([11,11]);j.iniciarMao();
  for(let n=0;j.estado.aberta && n<12;n++) j.jogar(j.estado.vez,0);
  assert.ok([0,1].includes(j.vencedor));assert.equal(j.estado.pontos[j.vencedor],12);
  assert.throws(()=>j.iniciarMao());assert.throws(()=>j.jogar(0,0));
});
test('CT18 - snapshots e placar inicial nao permitem alterar estado interno', () => {
  const pontos=[1,2],j=new Truco(pontos);pontos[0]=11;j.iniciarMao();
  const s=j.estado;s.pontos[0]=12;s.maos[0][0].valor='3';
  assert.equal(j.estado.pontos[0],1);assert.equal(j.estado.maos[0][0].valor,'4');
  assert.throws(()=>new Truco([12,0]),RangeError);
});
test('CT19 - mao de ferro oculta cartas e vira e nao permite truco', () => {
  const j=new Truco([11,11]);j.iniciarMao();
  assert.equal(j.estado.maoDeFerro,true);assert.equal(j.estado.vira,null);
  assert.ok(j.estado.maos.flat().every(c=>c===null));
  assert.throws(()=>j.pedirTruco(0));
});
test('CT20 - mao normal pontua um e permite iniciar a proxima mao', () => {
  const j=new Truco();j.iniciarMao();
  for(let n=0;j.estado.aberta && n<12;n++) j.jogar(j.estado.vez,0);
  assert.equal(j.estado.aberta,false);
  assert.equal(j.estado.pontos.reduce((a,b)=>a+b,0),1);
  j.iniciarMao(criarBaralho(),1);
  assert.equal(j.estado.vez,1);assert.deepEqual(j.estado.vazas,[]);
});
