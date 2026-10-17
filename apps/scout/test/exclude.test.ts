import { test } from "node:test";
import assert from "node:assert/strict";
import { exclusionReason } from "../src/lib/exclude.ts";

const ev = (title: string, venueName: string | null = null, description: string | null = null) => ({
  title,
  venueName,
  description,
});

test("scarta lirica e opera", () => {
  for (const e of [
    ev("La Traviata di Giuseppe Verdi", null, "Opera lirica"),
    ev("Gala lirico al Carignano"),
    ev("Recital lirico del soprano Anna Netrebko"),
    ev("Stagione lirica 2026"),
    ev("Opera buffa in piazza"),
    ev("Opera seria in teatro"),
    ev("La vedova allegra", null, "Operetta in tre atti"),
    ev("Serata di operette"),
    ev("Melodramma in tre atti"),
    // Il Regio è escluso come luogo intero: anche concerti e balletti, non solo l'opera (scelta provvisoria)
    ev("Concerto sinfonico", "Teatro Regio Torino"),
    ev("Festival Verismo | La bohème", "Teatro Regio di Torino"),
  ]) {
    assert.ok(exclusionReason(e), `doveva escludere: ${e.title}`);
  }
});

test("tiene «opera» nel senso di opera d'arte e il resto", () => {
  for (const e of [
    ev("Yayoi Kusama: l'opera completa", "OGR Torino"),
    ev("Mostra: le opere di Chagall"),
    ev("Un'opera d'arte al mese", "GAM"),
    ev("Club to Club 2026"),
    ev("Jazz al Folk Club", null, "Live con trio"),
    ev("Sagra della pasta alla norma"),
    ev("Carmen Consoli in concerto"),
    ev("Tosca"),
    ev("La Traviata di Giuseppe Verdi"),
    ev("Carmen", null, "di Georges Bizet"),
    ev("Recital del soprano Anna Netrebko"),
    ev("Concerto per tenore e pianoforte"),
    ev("Presentazione del libretto"),
    // Visto dal vivo (Eventbrite, 2026-10-16): il Regio è solo il punto di ritrovo del tour
    ev("I Caffè Storici di Torino: un viaggio a ritroso nel tempo", "Davanti Ingresso Teatro Regio", "Unisciti a noi per scoprire i caffè storici di Torino, luoghi in cui il caffè incontra la storia!"),
    // Visto dal vivo (Museo Egizio, 2026-10-11): il sax soprano non è lirica
    ev("Sax Appeal: classici e colonne sonore", "Museo Egizio", "Quartetto con sax soprano, contralto e tenore"),
  ]) {
    assert.equal(exclusionReason(e), null, `non doveva escludere: ${e.title}`);
  }
});

// Visti su DAOP (2026-10-15)
test("scarta corsi per neogenitori e attività per neonati", () => {
  for (const e of [
    ev("Guida pratica al neonato", "Movida Bar", "Incontro gratuito per gestanti e neomamme con una guida pratica alla cura del neonato."),
    ev("Post parto: salute pelvica e addominale"),
    ev("Massaggio infantile A.I.M.I. - Centro per le Famiglie", null, "Corso per genitori di bimbi 0-12 mesi."),
    ev("Essere genitori, che fatica", null, "Incontro di gruppo con lo psicologo sul tema della genitorialità."),
    ev("Non siamo d'accordo: conflitti in famiglia", null, "Incontro per genitori con la Dott.ssa Nigra."),
    ev("Consulenza educativa - Centro per le Famiglie"),
    ev("Pilates in Gravidanza - CàRezza"),
    ev("Da Mamma a Mamma", null, "Un incontro tra mamme con Roberta Ronco, Custode della Nascita."),
    ev("Bibliobebè con Floriana Lovera - bambini 9-18 mesi", null, "Per bambini dai 9 ai 18 mesi."),
    ev("Favolando", null, "Mini letture per bebè da 0 a 30 mesi."),
    ev("Abitare la Natura", null, "Laboratorio per bambini 0-3 anni."),
    ev("Corso primo soccorso pediatrico - Croce Bianca Fossano"),
    ev("Sicurezza e Benessere Neonato: Sportello Ostetrico e Psico-Educativo"),
    ev("I Patti Digitali di Comunità e la promozione delle alleanze genitoriali"),
    ev("Multisensoriale in Biblioteca - genitori e bambini 1-3 anni"),
  ]) {
    assert.ok(exclusionReason(e), `doveva escludere: ${e.title}`);
  }
});

test("scarta eventi dedicati a famiglie e bambini", () => {
  for (const e of [
    ev("Festa di Halloween - Centro per le Famiglie", null, "Festa di Halloween per bambini e famiglie: vieni mascherato!"),
    ev("Letture per bambini - mamma Isa", null, "Letture per bambini a cura di mamme, nonne e maestre del territorio."),
    ev("Laboratorio per i bambini"),
    ev("Spettacolo per le famiglie"),
    ev("Visita guidata per famiglie"),
    ev("Domenica al museo", null, "Attività dedicate alle famiglie."),
    ev("Giochiamo insieme", null, "Un pomeriggio rivolto ai bambini."),
    ev("Creiamo insieme", null, "Per genitori e figli."),
    // Sfuggiti alle regole precedenti (DB remoto, 2026-10-16)
    ev("Laboratorio al Circolo dei lettori", null, "Lab per bambine e bambini"),
    ev("La tartaruga e il pinguino innamorato", null, "Spettacolo musicale per bambini"),
    ev("Saldo Junior!", null, "Corso base di saldatura a stagno per bambini"),
    ev("Torino Magica – Halloween per famiglie"),
    ev("Open singing per famiglie"),
    ev("Pierino e il lupo con Maestro Lorenzo", null, "Un preschool musical"),
    ev("Laboratorio gratuito per bambini"),
    // L'eccezione «tante attività» non deve salvare un evento dedicato
    ev("Domenica speciale", null, "Giornata dedicata ai bambini con tante attività per famiglie"),
    ev("Alice è tornata", null, "Uno spettacolo per bambini dai 6 anni sulla capacità di ritrovare lo stupore."),
    ev("Carlo Tancredi di Barolo: L'educazione del giovane Marchese", null, "Attività teatralizzata per famiglie a Palazzo Barolo"),
    // L'eccezione di prezzo vale solo nella sua frase
    ev("Domenica in museo", null, "Ingresso gratuito per tutti, laboratorio per bambini"),
  ]) {
    assert.ok(exclusionReason(e), `doveva escludere: ${e.title}`);
  }
});

test("tiene eventi generici con menzioni di famiglie o bambini", () => {
  for (const e of [
    ev("Fiera del Rapulé", null, "Ingresso libero, per tutti da 0 a 99 anni."),
    ev("Concerto in piazza", null, "Ingresso gratuito per bambini."),
    ev("Mostra fotografica", null, "Riduzioni per le famiglie."),
    ev("Concerto d'autunno", null, "Biglietto a prezzo ridotto per bambini"),
    ev("Notte bianca", null, "Ingresso libero e gratuito per famiglie"),
    ev("Rassegna jazz", null, "Biglietti 10 euro, 5 € per bambini"),
    ev("Saldo Junior in concerto"),
    // Visto sul DB remoto (2026-10-16): attività per famiglie come contorno di una fiera
    ev("Mostra Mercato Nazionale del Tartufo Bianco delle Colline Torinesi 2026", null, "Tre giorni dedicati al pregiato Tuber Magnatum Pico, con il PalaTartufo gastronomico, la mostra mercato del tartufo, l'Expo della Collina e tante attività per famiglie nel cuore delle colline torinesi."),
    ev("Festa patronale", null, "Musica, stand gastronomici e anche giochi per bambini"),
    ev("Festa di paese", null, "Adatta anche alle famiglie."),
    ev("Film sulla famiglia", null, "La storia di due bambini."),
    ev("Jazz dal vivo", "Centro per le Famiglie"),
    ev("Il neonato collettivo teatrale in scena"),
    ev("Laboratorio per ragazzi 8-12 anni"),
    ev("Biblioteca 0-18: un tè tra gli scaffali"),
  ]) {
    assert.equal(exclusionReason(e), null, `non doveva escludere: ${e.title}`);
  }
});

// Visti sul DB remoto (2026-10-16): talk venduti come «spettacolo» e balletti classici
test("scarta balletto, conferenze e persone sgradite", () => {
  for (const e of [
    ev("Il Lago dei Cigni - International Classical Ballet of Ukraine", "Teatro Concordia", "Il corpo di ballo presenta Il Lago dei Cigni di Tchaikovsky."),
    ev("Gala di balletto"),
    ev("Roberto Saviano - Quel che resta di me", "Teatro Colosseo", "Roberto Saviano torna a teatro con uno spettacolo."),
    ev("Andrea Scanzi - Ora o mai più"),
    ev("Gianluca Gotto - Questione di Karma"),
    ev("UMBERTO GALIMBERTI - L'ETICA DEL VIANDANTE", null, "Teatro Prosa"),
    ev("Conferenza sul Rinascimento", "Circolo dei lettori"),
    ev("Lectio magistralis di filosofia"),
    ev("Incontro con l'autore"),
    ev("Presentazione del libro «Le città invisibili»"),
  ]) {
    assert.ok(exclusionReason(e), `doveva escludere: ${e.title}`);
  }
});

test("tiene conferenze a sfondo etico, danza e conferenze stampa", () => {
  for (const e of [
    ev("Conferenza di Emergency: vent'anni in Afghanistan"),
    ev("Don Luigi Ciotti in dialogo con gli studenti"),
    ev("Incontro con l'autore", null, "Con Medici Senza Frontiere, testimonianze dal Mediterraneo."),
    ev("49a Castagnata - Fèra à la Costa", null, "Castagne, vin brulé e conferenza sulla storia del borgo."),
    ev("Moltitudini. Una residenza tra arte e poesia", null, "L'artista dialoga con i poeti."),
    ev("ANTONELLO COSTA - GIOCHIAMO AL VARIETÀ", null, "Con il corpo di ballo e l'orchestra."),
    ev("ALISEO VARIATION / I LOVE YOU, SCHUBERT! - BALLETTO TEATRO DI TORINO"),
    ev("Conferenza sui diritti umani"),
    ev("Danza contemporanea alla Lavanderia a Vapore"),
    ev("Mostra di Chagall", null, "Inaugurazione dopo la conferenza stampa delle 11."),
  ]) {
    assert.equal(exclusionReason(e), null, `non doveva escludere: ${e.title}`);
  }
});

// Falso negativo noto (2026-10-16): «tante/anche/varie… attività per famiglie» è trattato come
// contorno di un evento più ampio. Senza «dedicato/rivolto/pensato» o un pubblico dichiarato
// dalla fonte, un evento davvero per famiglie scritto così passa. Se cambia, aggiornare qui.
test("falso negativo noto: «tante attività per famiglie» senza altri segnali viene tenuto", () => {
  assert.equal(exclusionReason(ev("Domenica al museo", null, "Domenica al museo: tante attività per famiglie")), null);
});
