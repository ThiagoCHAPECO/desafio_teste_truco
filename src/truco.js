export const VALORES = Object.freeze(['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3']);
export const NAIPES = Object.freeze(['ouros', 'espadas', 'copas', 'paus']);
export const criarBaralho = () => VALORES.flatMap(valor => NAIPES.map(naipe => ({ valor, naipe })));

function validarCarta(c) {
  if (!c || !VALORES.includes(c.valor) || !NAIPES.includes(c.naipe)) throw new RangeError('Carta invalida');
}
export function forca(carta, vira) {
  validarCarta(carta); validarCarta(vira);
  const manilha = VALORES[(VALORES.indexOf(vira.valor) + 1) % 10];
  return carta.valor === manilha ? 10 + NAIPES.indexOf(carta.naipe) : VALORES.indexOf(carta.valor);
}
export function vencedorVaza(jogadas, vira) {
  if (jogadas.length !== 4 || new Set(jogadas.map(j => j.jogador)).size !== 4 ||
      jogadas.some(j => !Number.isInteger(j.jogador) || j.jogador < 0 || j.jogador > 3))
    throw new RangeError('Quatro jogadores diferentes sao necessarios');
  const maior = Math.max(...jogadas.map(j => forca(j.carta, vira)));
  const melhores = jogadas.filter(j => forca(j.carta, vira) === maior);
  const equipes = new Set(melhores.map(j => j.jogador % 2));
  return equipes.size === 1 ? melhores[0].jogador : null;
}

export function vencedorMao(vazas, equipeMao) {
  if (!Array.isArray(vazas) || vazas.length > 3 || ![0, 1].includes(equipeMao) ||
      vazas.some(v => v !== null && v !== 0 && v !== 1)) throw new RangeError('Vazas invalidas');
  const vitorias = [vazas.filter(v => v === 0).length, vazas.filter(v => v === 1).length];
  if (vitorias[0] === 2) return 0;
  if (vitorias[1] === 2) return 1;
  if (vazas.length < 2) return null;
  if (vazas[0] === null && vazas[1] !== null) return vazas[1];
  if (vazas[0] !== null && vazas[1] === null) return vazas[0];
  if (vazas.length < 3) return null;
  if (vazas[0] !== null) return vazas[0];
  return vazas[2] ?? equipeMao;
}

export class Truco {
  #pontos = [0, 0]; #maos = []; #vira; #vez = 0; #mao = 0; #jogadas = []; #vazas = [];
  #valor = 1; #pedido = null; #ultimaSolicitante = null; #aberta = false; #decisao11 = null;
  #ferro = false;
  constructor(pontos = [0, 0]) {
    if (!Array.isArray(pontos) || pontos.length !== 2 ||
        pontos.some(n => !Number.isInteger(n) || n < 0 || n >= 12)) throw new RangeError('Placar invalido');
    this.#pontos = [...pontos];
  }
  iniciarMao(baralho = criarBaralho(), mao = 0) {
    if (this.vencedor !== null || this.#aberta) throw new Error('Nao pode iniciar mao');
    if (!Number.isInteger(mao) || mao < 0 || mao > 3 || !Array.isArray(baralho) || baralho.length !== 40)
      throw new RangeError('Distribuicao invalida');
    baralho.forEach(validarCarta);
    if (new Set(baralho.map(c => c.valor + c.naipe)).size !== 40) throw new RangeError('Cartas repetidas');
    this.#maos = Array.from({ length: 4 }, (_, j) => baralho.slice(j * 3, j * 3 + 3).map(c => ({ ...c })));
    this.#vira = { ...baralho[12] };
    this.#vez = mao; this.#mao = mao; this.#vazas = []; this.#jogadas = [];
    this.#valor = 1; this.#pedido = null; this.#ultimaSolicitante = null; this.#aberta = true;
    this.#ferro = this.#pontos.every(p => p === 11);
    this.#decisao11 = this.#pontos[0] === 11 && this.#pontos[1] !== 11 ? 0 :
      this.#pontos[1] === 11 && this.#pontos[0] !== 11 ? 1 : null;
  }
  decidirMao11(equipe, aceitar) {
    if (this.#decisao11 === null || equipe !== this.#decisao11 || typeof aceitar !== 'boolean')
      throw new Error('Decisao invalida');
    this.#decisao11 = null;
    if (aceitar) this.#valor = 3;
    else this.#encerrar(1 - equipe, 1);
  }
  #jogavel() {
    if (!this.#aberta || this.#pedido || this.#decisao11 !== null) throw new Error('Acao indisponivel');
  }
  jogar(jogador, indice) {
    this.#jogavel();
    if (jogador !== this.#vez) throw new Error('Fora da vez');
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.#maos[jogador].length)
      throw new RangeError('Carta invalida');
    this.#jogadas.push({ jogador, carta: this.#maos[jogador].splice(indice, 1)[0] });
    if (this.#jogadas.length < 4) { this.#vez = (jogador + 1) % 4; return; }
    const vencedor = vencedorVaza(this.#jogadas, this.#vira);
    this.#vazas.push(vencedor === null ? null : vencedor % 2);
    this.#vez = vencedor ?? this.#jogadas[0].jogador;
    this.#jogadas = [];
    const equipe = vencedorMao(this.#vazas, this.#mao % 2);
    if (equipe !== null) this.#encerrar(equipe, this.#valor);
  }
  pedirTruco(jogador) {
    this.#jogavel();
    if (jogador !== this.#vez || this.#pontos.includes(11) ||
        jogador % 2 === this.#ultimaSolicitante || this.#valor === 12) throw new Error('Pedido invalido');
    this.#pedido = { equipe: jogador % 2, valor: this.#valor === 1 ? 3 : this.#valor + 3 };
  }
  responderTruco(equipe, aceitar) {
    if (!this.#pedido || equipe !== 1 - this.#pedido.equipe || typeof aceitar !== 'boolean')
      throw new Error('Resposta invalida');
    const pedido = this.#pedido; this.#pedido = null;
    if (aceitar) { this.#valor = pedido.valor; this.#ultimaSolicitante = pedido.equipe; }
    else this.#encerrar(pedido.equipe, this.#valor);
  }
  #encerrar(equipe, valor) {
    this.#pontos[equipe] = Math.min(12, this.#pontos[equipe] + valor);
    this.#aberta = false;
  }
  get vencedor() { return this.#pontos[0] >= 12 ? 0 : this.#pontos[1] >= 12 ? 1 : null; }
  get estado() {
    return { pontos: [...this.#pontos], maos: this.#maos.map(m => m.map(c => this.#ferro ? null : ({ ...c }))),
      vira: this.#ferro ? null : this.#vira && { ...this.#vira }, maoDeFerro: this.#ferro,
      vez: this.#vez, valor: this.#valor,
      vazas: [...this.#vazas], aberta: this.#aberta, decisao11: this.#decisao11,
      pedido: this.#pedido && { ...this.#pedido }, vencedor: this.vencedor };
  }
}
