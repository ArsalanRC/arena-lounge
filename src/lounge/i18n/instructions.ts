/**
 * Localised game names + rule overviews, extracted from Game Arena
 * (game-platform/messages/*.json) by tools/extract-instructions.py.
 * Do not edit by hand; re-run the script.
 */
import type { GameId } from '../games/types'

export interface LocaleInfo {
  code: string
  /** Language name in its own language, for the picker. */
  name: string
  rtl: boolean
  games: Partial<Record<GameId, { name: string; overview: string }>>
}

export const LOCALES: LocaleInfo[] = [
  {
    "code": "en",
    "name": "English",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Connect Four",
        "overview": "Take turns dropping discs into a 7-column board. Your disc falls to the lowest empty cell in the chosen column. First to align four of your discs, horizontally, vertically, or diagonally, wins. If the board fills with no winner, it's a draw."
      },
      "dotlines": {
        "name": "Dot Lines",
        "overview": "Take turns drawing lines between adjacent dots on a 6×6 grid (5×5 boxes, 60 edges). Complete a 1×1 box by drawing its fourth side to claim it and take another turn. When all 60 lines are drawn, the player with the most boxes wins."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi is the classic 8×8 disc-flip strategy game. Place your disc on an empty square that flanks at least one straight line of enemy discs with your own colour at the far end. All flanked discs flip to your colour. Player with the most discs when neither side can move wins."
      },
      "tictactoe": {
        "name": "Tic Tac Toe",
        "overview": "Tic Tac Toe is a classic two-player game played on a 3×3 grid. Players take turns placing their mark, X or O, aiming to get three in a row before their opponent."
      },
      "matchpairs": {
        "name": "Match Pairs",
        "overview": "Flip cards two at a time to find matching pairs. When you find a match the pair is yours and you flip again immediately. When you miss, both cards flip back and the turn passes. Game ends when every pair is claimed, most pairs wins. Solo: challenge yourself to clear the board in fewer moves."
      },
      "checkers": {
        "name": "Checkers",
        "overview": "Checkers (American Draughts) is a two-player strategy game on the dark squares of an 8×8 board. Each side starts with 12 men; the goal is to capture every opposing piece or block the opponent so they have no legal move."
      },
      "chess": {
        "name": "Chess",
        "overview": "Chess is a two-player strategy game on an 8×8 board. Each player starts with 16 pieces; the goal is to deliver checkmate, attack the opposing king so it has no legal escape."
      },
      "crocsnap": {
        "name": "Croc Snap",
        "overview": "Croc Snap is a suspenseful party game for 2–4 players. A crocodile has 12 teeth, one of them triggers the snap! Take turns pressing teeth and hope you don't get bitten."
      }
    }
  },
  {
    "code": "es",
    "name": "Español",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Conecta cuatro",
        "overview": "Turnos para soltar discos en un tablero de 7 columnas. Tu disco cae a la celda más baja disponible de la columna elegida. El primero en alinear cuatro discos, horizontal, vertical o diagonalmente, gana. Si el tablero se llena sin ganador, es empate."
      },
      "dotlines": {
        "name": "Puntos y cajas",
        "overview": "Por turnos, dibuja líneas entre puntos adyacentes en una cuadrícula de 6×6 (5×5 cajas, 60 aristas). Completa una caja de 1×1 dibujando su cuarto lado para reclamarla y jugar de nuevo. Cuando se dibujen las 60 líneas, gana el jugador con más cajas."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi es el clásico juego de estrategia de voltear discos en un tablero 8×8. Coloca tu disco en una casilla vacía que flanquee al menos una línea recta de discos enemigos con uno tuyo al otro extremo. Todos los discos flanqueados se voltean a tu color. Gana el jugador con más discos cuando ninguno pueda mover."
      },
      "tictactoe": {
        "name": "Tres en raya",
        "overview": "Tres en Raya es un juego clásico de dos jugadores en una cuadrícula de 3×3. Los jugadores alternan colocando X u O, intentando alinear tres antes que el rival."
      },
      "matchpairs": {
        "name": "Busca parejas",
        "overview": "Voltea cartas de dos en dos para encontrar pares iguales. Si encuentras un par, es tuyo y vuelves a voltear inmediatamente. Si fallas, ambas cartas se vuelven a girar y pasa el turno. La partida termina cuando todos los pares están reclamados, gana quien tenga más. En solitario: intenta limpiar el tablero en menos movimientos."
      },
      "checkers": {
        "name": "Damas",
        "overview": "Las damas (American Draughts) son un juego para dos jugadores en las casillas oscuras de un tablero 8×8. Cada lado empieza con 12 piezas; el objetivo es capturar todas las del rival o dejarlo sin jugadas legales."
      },
      "chess": {
        "name": "Ajedrez",
        "overview": "El ajedrez es un juego de estrategia para dos jugadores en un tablero de 8×8. Cada jugador empieza con 16 piezas; el objetivo es dar jaque mate, atacar al rey rival sin que pueda escapar."
      },
      "crocsnap": {
        "name": "Cocodrilo Snap",
        "overview": "Croc Snap es un juego de fiesta lleno de suspense para 2–4 jugadores. Un cocodrilo tiene 12 dientes, ¡uno de ellos dispara el mordisco! Pulsa dientes por turnos y reza por no ser mordido."
      }
    }
  },
  {
    "code": "pt",
    "name": "Português",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Lig 4",
        "overview": "Reveze-se soltando discos em um tabuleiro de 7 colunas. Seu disco cai para a célula vazia mais baixa da coluna escolhida. O primeiro a alinhar quatro discos, horizontal, vertical ou diagonal, vence. Se o tabuleiro encher sem vencedor, é empate."
      },
      "dotlines": {
        "name": "Pontos e caixas",
        "overview": "Reveze-se desenhando linhas entre pontos adjacentes em uma grade 6×6 (5×5 caixas, 60 arestas). Complete uma caixa 1×1 desenhando seu quarto lado para reivindicá-la e jogar novamente. Quando todas as 60 linhas forem desenhadas, o jogador com mais caixas vence."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi é o clássico jogo de virar discos em tabuleiro 8×8. Coloque seu disco em uma casa vazia que flanqueie pelo menos uma linha reta de discos inimigos com seu próprio disco na outra ponta. Todos os discos flanqueados viram para sua cor. O jogador com mais discos quando ninguém puder jogar vence."
      },
      "tictactoe": {
        "name": "Jogo da velha",
        "overview": "Tic Tac Toe é um jogo clássico para dois jogadores em uma grade 3×3. Os jogadores se revezam colocando sua marca, X ou O, tentando alinhar três antes do oponente."
      },
      "matchpairs": {
        "name": "Jogo da memória",
        "overview": "Vire cartas duas de cada vez para encontrar pares. Quando encontrar um par, ele é seu e você vira novamente. Quando errar, ambas as cartas voltam e o turno passa. O jogo termina quando todos os pares forem encontrados, quem tiver mais pares vence. Solo: desafie-se a limpar o tabuleiro em menos movimentos."
      },
      "checkers": {
        "name": "Damas",
        "overview": "Damas (American Draughts) é jogado nas casas escuras de um tabuleiro 8×8. Cada lado começa com 12 peças; o objetivo é capturar todas as peças adversárias ou bloquear o oponente."
      },
      "chess": {
        "name": "Xadrez",
        "overview": "Xadrez é um jogo de estratégia para dois jogadores em um tabuleiro 8×8. Cada jogador começa com 16 peças; o objetivo é dar xeque-mate, atacar o rei adversário sem escapatória."
      },
      "crocsnap": {
        "name": "Croco Snap",
        "overview": "Croc Snap é um jogo de festa de suspense para 2–4 jogadores. Um crocodilo tem 12 dentes, um deles aciona a mordida! Reveze-se pressionando dentes e torça para não ser mordido."
      }
    }
  },
  {
    "code": "de",
    "name": "Deutsch",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Vier gewinnt",
        "overview": "Werft abwechselnd Spielsteine in ein 7-Spalten-Brett. Dein Stein fällt auf die niedrigste freie Zelle in der gewählten Spalte. Wer zuerst vier Steine in einer Reihe hat, horizontal, vertikal oder diagonal, gewinnt. Ist das Brett voll ohne Gewinner, endet es unentschieden."
      },
      "dotlines": {
        "name": "Käsekästchen",
        "overview": "Zeichne abwechselnd Linien zwischen benachbarten Punkten auf einem 6×6-Raster (5×5 Kästchen, 60 Kanten). Vervollständige ein 1×1-Kästchen, indem du seine vierte Seite zeichnest, um es zu beanspruchen und nochmal zu ziehen. Wenn alle 60 Linien gezogen sind, gewinnt der Spieler mit den meisten Kästchen."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi ist das klassische 8×8-Scheiben-Umdreh-Strategiespiel. Setze deine Scheibe auf ein leeres Feld, das mindestens eine gerade Linie gegnerischer Scheiben mit deiner eigenen Farbe am anderen Ende einschließt. Alle eingeschlossenen Scheiben werden umgedreht. Wer die meisten Scheiben hat, wenn keine Seite mehr ziehen kann, gewinnt."
      },
      "tictactoe": {
        "name": "Tic Tac Toe",
        "overview": "Tic Tac Toe ist ein klassisches Zweispielerspiel auf einem 3×3-Raster. Spieler setzen abwechselnd ihr Zeichen, X oder O, und versuchen, drei in einer Reihe zu bekommen."
      },
      "matchpairs": {
        "name": "Memo-Spiel",
        "overview": "Decke jeweils zwei Karten auf, um passende Paare zu finden. Bei einem Treffer gehört das Paar dir und du deckst sofort nochmal auf. Bei einem Fehlversuch werden beide Karten nach kurzer Pause wieder umgedreht und der Zug geht weiter. Das Spiel endet, wenn alle Paare gefunden sind, die meisten Paare gewinnen. Solo: Versuche, das Brett in möglichst wenigen Zügen zu räumen."
      },
      "checkers": {
        "name": "Dame",
        "overview": "Dame (American Draughts) wird auf den dunklen Feldern eines 8×8-Bretts gespielt. Jede Seite startet mit 12 Steinen; Ziel ist es, alle gegnerischen Steine zu schlagen oder den Gegner so zu blockieren, dass er keinen legalen Zug hat."
      },
      "chess": {
        "name": "Schach",
        "overview": "Schach ist ein Zweispieler-Strategiespiel auf einem 8×8-Brett. Jeder Spieler startet mit 16 Figuren; das Ziel ist Schachmatt, den gegnerischen König so anzugreifen, dass er keinen legalen Ausweg hat."
      },
      "crocsnap": {
        "name": "Kroko Schnapp",
        "overview": "Croc Snap ist ein spannendes Partyspiel für 2–4 Spieler. Ein Krokodil hat 12 Zähne, einer davon löst den Biss aus! Drückt abwechselnd Zähne und hofft, nicht gebissen zu werden."
      }
    }
  },
  {
    "code": "fr",
    "name": "Français",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Puissance 4",
        "overview": "À tour de rôle, lâchez des disques dans un plateau de 7 colonnes. Votre disque tombe dans la case la plus basse disponible de la colonne choisie. Le premier à aligner quatre disques, horizontalement, verticalement ou en diagonale, gagne. Si le plateau se remplit sans vainqueur, c'est un match nul."
      },
      "dotlines": {
        "name": "Points et carrés",
        "overview": "À tour de rôle, tracez des lignes entre des points adjacents sur une grille 6×6 (5×5 boîtes, 60 arêtes). Complétez une boîte 1×1 en traçant son quatrième côté pour la revendiquer et rejouer. Quand les 60 lignes sont tracées, le joueur avec le plus de boîtes gagne."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi est le classique jeu de stratégie de retournement de disques sur un plateau 8×8. Placez votre disque sur une case vide qui flanque au moins une ligne droite de disques ennemis avec un des vôtres à l'autre bout. Tous les disques flanqués se retournent à votre couleur. Le joueur avec le plus de disques quand aucun ne peut jouer gagne."
      },
      "tictactoe": {
        "name": "Morpion",
        "overview": "Le Morpion est un jeu classique à deux joueurs sur une grille 3×3. Les joueurs alternent en plaçant X ou O pour aligner trois symboles avant l'adversaire."
      },
      "matchpairs": {
        "name": "Jeu de mémoire",
        "overview": "Retournez deux cartes à la fois pour trouver des paires identiques. Si vous trouvez une paire, elle est à vous et vous rejouez immédiatement. Si vous vous trompez, les deux cartes se retournent et le tour passe. La partie se termine quand toutes les paires sont prises, celui qui en a le plus gagne. En solo : essayez de vider le plateau en moins de coups."
      },
      "checkers": {
        "name": "Jeu de dames",
        "overview": "Les dames (variante américaine) se jouent à deux sur les cases sombres d'un plateau 8×8. Chaque camp commence avec 12 pions ; le but est de capturer tous les pions adverses ou de bloquer l'adversaire sans coup légal."
      },
      "chess": {
        "name": "Échecs",
        "overview": "Les échecs sont un jeu de stratégie à deux joueurs sur un échiquier 8×8. Chaque joueur commence avec 16 pièces ; le but est le mat, attaquer le roi adverse sans issue possible."
      },
      "crocsnap": {
        "name": "Croco Snap",
        "overview": "Croc Snap est un jeu de fête à suspense pour 2–4 joueurs. Un crocodile a 12 dents, l'une déclenche la morsure ! Appuyez sur les dents à tour de rôle et priez pour ne pas être mordu."
      }
    }
  },
  {
    "code": "it",
    "name": "Italiano",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Forza 4",
        "overview": "A turno, lascia cadere dischi in un tabellone a 7 colonne. Il tuo disco cade nella cella vuota più bassa della colonna scelta. Il primo ad allineare quattro dischi, in orizzontale, verticale o diagonale, vince. Se il tabellone si riempie senza vincitore, è pareggio."
      },
      "dotlines": {
        "name": "Punti e quadrati",
        "overview": "A turno, disegna linee tra punti adiacenti su una griglia 6×6 (5×5 caselle, 60 bordi). Completa una casella 1×1 disegnando il suo quarto lato per reclamarla e giocare di nuovo. Quando tutte le 60 linee sono disegnate, il giocatore con più caselle vince."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi è il classico gioco di dischi da girare su tabellone 8×8. Piazza il tuo disco su una casella vuota che fiancheggi almeno una linea retta di dischi nemici con il tuo colore all'estremità. Tutti i dischi fiancheggiati si girano al tuo colore. Il giocatore con più dischi quando nessuno può muovere vince."
      },
      "tictactoe": {
        "name": "Tris",
        "overview": "Tic Tac Toe è un classico a due giocatori su una griglia 3×3. I giocatori si alternano piazzando il loro simbolo, X o O, cercando di allinearne tre prima dell'avversario."
      },
      "matchpairs": {
        "name": "Gioco di memoria",
        "overview": "Gira le carte due alla volta per trovare coppie. Quando trovi una coppia è tua e giri di nuovo. Quando sbagli, entrambe le carte si rigirano e il turno passa. La partita finisce quando tutte le coppie sono trovate, chi ne ha di più vince. Solitario: sfida te stesso a pulire il tabellone in meno mosse."
      },
      "checkers": {
        "name": "Dama",
        "overview": "La dama (American Draughts) si gioca sulle caselle scure di una scacchiera 8×8. Ogni lato inizia con 12 pezzi; l'obiettivo è catturare tutti i pezzi avversari o bloccare l'avversario."
      },
      "chess": {
        "name": "Scacchi",
        "overview": "Gli scacchi sono un gioco di strategia per due giocatori su una scacchiera 8×8. Ogni giocatore inizia con 16 pezzi; l'obiettivo è dare scaccomatto, attaccare il re avversario senza via di fuga."
      },
      "crocsnap": {
        "name": "Cocco Snap",
        "overview": "Croc Snap è un party game di suspense per 2–4 giocatori. Un coccodrillo ha 12 denti, uno di essi fa scattare il morso! A turno premete i denti e sperate di non essere morsi."
      }
    }
  },
  {
    "code": "pl",
    "name": "Polski",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Czwórki",
        "overview": "Na zmianę wrzucaj krążki do planszy z 7 kolumnami. Pierwszy, kto ułoży cztery w rzędzie, wygrywa. Pełna plansza bez zwycięzcy = remis."
      },
      "dotlines": {
        "name": "Kropki i kratki",
        "overview": "Na zmianę rysujcie linie między sąsiednimi kropkami na siatce 6×6. Zamknij 4. bok pola, aby je zająć i rysować ponownie. 60 linii, kto ma więcej pól, wygrywa."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi to strategiczna gra z odwracaniem dysków na planszy 8×8. Otocz dyski przeciwnika swoimi, aby je odwrócić. Kto ma więcej dysków, gdy nikt nie może grać, wygrywa."
      },
      "tictactoe": {
        "name": "Kółko i krzyżyk",
        "overview": "Kółko i krzyżyk to klasyczna gra dwuosobowa na siatce 3×3. Gracze na zmianę stawiają X lub O, starając się ustawić trzy w rzędzie."
      },
      "matchpairs": {
        "name": "Dobierz pary",
        "overview": "Odwracaj karty po dwie, szukając par. Znalazłeś parę, twoja i dodatkowy ruch. Nie pasuje, karty wracają. Wygrywa ten z większą liczbą par. Solo: mniej ruchów = lepiej."
      },
      "checkers": {
        "name": "Warcaby",
        "overview": "Warcaby (American Draughts) to gra dwuosobowa na ciemnych polach planszy 8×8. Każda strona ma 12 pionków; celem jest zbicie wszystkich pionków przeciwnika lub zablokowanie go."
      },
      "chess": {
        "name": "Szachy",
        "overview": "Szachy to strategiczna gra dwuosobowa na planszy 8×8. Każdy gracz ma 16 figur; celem jest mat, zaatakowanie króla bez możliwości ucieczki."
      },
      "crocsnap": {
        "name": "Krokodyl u dentysty",
        "overview": "Croc Snap to pełna napięcia gra imprezowa dla 2–4 graczy. Krokodyl ma 12 zębów, jeden uruchamia ugryzienie! Naciskaj zęby i miej nadzieję."
      }
    }
  },
  {
    "code": "tr",
    "name": "Türkçe",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Dörtlü Diz",
        "overview": "Sırayla 7 sütunlu tahtaya disk at. Disk en alt boş hücreye düşer. Yatay, dikey veya çapraz dört hizalayan kazanır. Tahta dolarsa berabere."
      },
      "dotlines": {
        "name": "Nokta Çizgi",
        "overview": "Sırayla 6×6 ızgarada komşu noktalar arasına çizgi çiz. 4. kenarı tamamlayarak kutuyu al ve tekrar çiz. 60 çizgiden sonra en çok kutuya sahip olan kazanır."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi 8×8 disk çevirme strateji oyunudur. Rakip diskleri kendi renginle çevreleyerek çevir. Kimse oynayamadığında en çok disk kazanır."
      },
      "tictactoe": {
        "name": "SOS Oyunu",
        "overview": "XOX, 3×3 ızgarada oynanan klasik iki kişilik oyundur. Oyuncular sırayla X veya O işaretini koyar, üç hizaya getiren kazanır."
      },
      "matchpairs": {
        "name": "Eş Bul",
        "overview": "Eşleşen çiftleri bulmak için kartları ikişer çevir. Eşleşme bulursan çiftin olur ve tekrar çevirirsin. Eşleşmezse kapanır ve sıra geçer. En çok çifti toplayan kazanır. Solo: az hamle = iyi."
      },
      "checkers": {
        "name": "Dama",
        "overview": "Dama (Amerikan kuralları) 8×8 tahtanın koyu karelerinde iki oyunculudur. Her taraf 12 taşla başlar; tüm rakip taşları almayı veya hareket edemez hale getirmeyi hedefle."
      },
      "chess": {
        "name": "Satranç",
        "overview": "Satranç 8×8 tahtada iki oyunculu strateji oyunudur. Her oyuncunun 16 taşı vardır; amaç mat, rakip şahı kaçamayacak şekilde tehdit et."
      },
      "crocsnap": {
        "name": "Timsah Dişçisi",
        "overview": "Croc Snap 2–4 oyunculu gerilim dolu parti oyunudur. 12 dişten biri ısırığı tetikler! Dişlere bas ve ısırılmamayı um."
      }
    }
  },
  {
    "code": "ru",
    "name": "Русский",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Четыре в ряд",
        "overview": "По очереди бросайте диски в доску с 7 столбцами. Первый, кто выстроит четыре в ряд, побеждает. Если поле заполнено без победителя, ничья."
      },
      "dotlines": {
        "name": "Точки и квадраты",
        "overview": "По очереди рисуйте линии между соседними точками на сетке 6×6. Завершите 4-ю сторону клетки, чтобы забрать её и получить ещё ход. 60 линий, побеждает тот, у кого больше клеток."
      },
      "reversi": {
        "name": "Реверси",
        "overview": "Реверси, стратегия с переворотом дисков на поле 8×8. Зажмите ряд вражеских дисков вашим цветом. Побеждает тот, у кого больше дисков, когда никто не может ходить."
      },
      "tictactoe": {
        "name": "Крестики-нолики",
        "overview": "Крестики-нолики, классическая игра на двоих на сетке 3×3. Игроки по очереди ставят свой знак, X или O, стремясь собрать три в ряд раньше соперника."
      },
      "matchpairs": {
        "name": "Найди пару",
        "overview": "Переворачивайте карты по две для поиска пар. Нашли пару, ваша и ещё ход. Не совпало, карты закрываются. Побеждает тот, у кого больше пар. Соло: меньше ходов, лучше."
      },
      "checkers": {
        "name": "Шашки",
        "overview": "Шашки (американский вариант), игра на двоих на тёмных клетках доски 8×8. У каждой стороны 12 шашек; цель, захватить все шашки противника или заблокировать его."
      },
      "chess": {
        "name": "Шахматы",
        "overview": "Шахматы, стратегическая игра на двоих на доске 8×8. У каждого игрока 16 фигур; цель, поставить мат, атаковать короля противника так, чтобы ему некуда было деться."
      },
      "crocsnap": {
        "name": "Крокодил-дантист",
        "overview": "Croc Snap, напряжённая вечеринковая игра для 2–4 игроков. У крокодила 12 зубов, один из них активирует укус! Нажимайте зубы и надейтесь, что вас не укусят."
      }
    }
  },
  {
    "code": "zh",
    "name": "中文",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "四子棋",
        "overview": "交替向7列棋盘中投入圆片。圆片落到所选列的最低空格。先横、竖或斜连成4个的一方获胜。棋盘满而无获胜者则为平局。"
      },
      "dotlines": {
        "name": "点线之战",
        "overview": "在6×6点阵上轮流画线（5×5个格子，60条边）。画出1×1格子的第四条边即占领该格并额外画一次。全部60条线画完后，拥有最多格子的玩家获胜。"
      },
      "reversi": {
        "name": "黑白棋",
        "overview": "黑白棋是经典的8×8翻转棋策略游戏。在空格上放置棋子，用你的颜色夹住对方的一条直线棋子，被夹住的棋子全部翻转。双方都无法落子时棋子多的一方获胜。"
      },
      "tictactoe": {
        "name": "井字棋",
        "overview": "井字棋是经典的双人3×3格子游戏。交替放置X或O标记，率先连成三子者获胜。"
      },
      "matchpairs": {
        "name": "配对翻牌",
        "overview": "每次翻两张牌寻找匹配的对。找到匹配则获得该对并立即再翻。未匹配则牌翻回背面，轮到下一位。所有对被找到后游戏结束, 获得最多对的玩家获胜。单人模式：挑战用更少步数清空棋盘。"
      },
      "checkers": {
        "name": "西洋跳棋",
        "overview": "西洋跳棋（美式）在8×8棋盘的深色格子上进行。每位玩家12枚棋子，目标是吃掉对方所有棋子或使对方无法走棋。"
      },
      "chess": {
        "name": "国际象棋",
        "overview": "国际象棋是8×8棋盘上的双人策略游戏。每位玩家拥有16枚棋子，目标是将死对方的王。"
      },
      "crocsnap": {
        "name": "鳄鱼咬咬",
        "overview": "鳄鱼咬咬是2–4人惊险派对游戏。鳄鱼有12颗牙齿，其中1颗会触发咬合！轮流按牙齿，祈祷不被咬到吧。"
      }
    }
  },
  {
    "code": "ja",
    "name": "日本語",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "コネクトフォー",
        "overview": "7列のボードに交互にディスクを落とします。選んだ列の一番下の空きマスにディスクが落ちます。縦・横・斜めに4つ並べた方が勝ち。ボードが埋まって勝者がいなければ引き分け。"
      },
      "dotlines": {
        "name": "ドットライン",
        "overview": "6×6のドットグリッド上で交互に線を引きます（5×5のボックス、60辺）。1×1のボックスの4辺目を引くとそのボックスを獲得し、追加ターン。60本全て引き終わったら、最もボックスが多いプレイヤーの勝ち。"
      },
      "reversi": {
        "name": "リバーシ",
        "overview": "リバーシは8×8のディスク反転戦略ゲーム。空きマスにディスクを置き、自分のディスクで相手のディスクを一直線に挟むと反転。どちらも打てなくなった時にディスクが多い方が勝ち。"
      },
      "tictactoe": {
        "name": "三目並べ",
        "overview": "三目並べは3×3のグリッドで遊ぶ古典的な2人用ゲーム。XまたはOを交互に置き、先に3つ並べた方が勝ちです。"
      },
      "matchpairs": {
        "name": "マッチペア",
        "overview": "カードを2枚ずつめくってペアを探す。一致すればそのペアを獲得し、もう一度めくれる。不一致なら裏に戻してターン交代。全ペアが取られたらゲーム終了, 最多ペアの人が勝ち。ソロ: 少ない手数でクリアを目指そう。"
      },
      "checkers": {
        "name": "チェッカー",
        "overview": "チェッカー（アメリカン・ドラフツ）は8×8の暗い色のマスで2人が対戦。各プレイヤーは12個の駒でスタートし、相手の駒を全て取るか動けなくすると勝ちです。"
      },
      "chess": {
        "name": "チェス",
        "overview": "チェスは8×8の盤上で行う2人用の戦略ゲーム。各プレイヤーは16個の駒でスタートし、相手のキングをチェックメイトすると勝ちです。"
      },
      "crocsnap": {
        "name": "クロックスナップ",
        "overview": "クロックスナップは2〜4人向けのスリル満点パーティーゲーム。ワニの12本の歯のうち1本がトリガー! 順番に歯を押して、噛まれないことを祈りましょう。"
      }
    }
  },
  {
    "code": "hi",
    "name": "हिन्दी",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "कनेक्ट फोर",
        "overview": "7-कॉलम बोर्ड में गोटी डालें। चार एक पंक्ति में पहले।"
      },
      "dotlines": {
        "name": "डॉट लाइन्स",
        "overview": "6×6 डॉट ग्रिड पर लाइनें खींचें। बॉक्स पूरा करें, अतिरिक्त बारी लें।"
      },
      "reversi": {
        "name": "रिवर्सी",
        "overview": "8×8 बोर्ड पर गोटियां घेरकर पलटें। ज़्यादा गोटियां जीतती हैं।"
      },
      "tictactoe": {
        "name": "टिक-टैक-टो",
        "overview": "टिक टैक टो 3×3 ग्रिड का क्लासिक खेल है। पहले तीन चिह्न एक पंक्ति में लगाने वाला जीतता है।"
      },
      "matchpairs": {
        "name": "जोड़ी मिलाओ",
        "overview": "दो पत्ते पलटें, मिलान खोजें। ज़्यादा जोड़ियां बनाएं।"
      },
      "checkers": {
        "name": "चेकर्स",
        "overview": "चेकर्स (American Draughts) 8×8 बोर्ड के गहरे वर्गों पर दो खिलाड़ियों का खेल है।"
      },
      "chess": {
        "name": "शतरंज",
        "overview": "शतरंज दो खिलाड़ियों का 8×8 बोर्ड पर सामरिक खेल है। विरोधी राजा को चेकमेट करें।"
      },
      "crocsnap": {
        "name": "क्रोक स्नैप",
        "overview": "Croc Snap 2–4 खिलाड़ियों का रोमांचक पार्टी गेम है। 12 दांतों में से एक काटने को ट्रिगर करता है!"
      }
    }
  },
  {
    "code": "id",
    "name": "Bahasa Indonesia",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Sambung Empat",
        "overview": "Bergiliran menjatuhkan cakram ke papan 7 kolom. Cakrammu jatuh ke sel kosong terendah di kolom yang dipilih. Yang pertama menyejajarkan empat cakram, horizontal, vertikal, atau diagonal, menang. Jika papan penuh tanpa pemenang, permainan seri."
      },
      "dotlines": {
        "name": "Garis Titik",
        "overview": "Bergiliran menggambar garis antara titik yang berdekatan di kisi 6×6 (5×5 kotak, 60 sisi). Selesaikan kotak 1×1 dengan menggambar sisi keempatnya untuk mengklaimnya dan mendapat giliran lagi. Saat semua 60 garis tergambar, pemain dengan kotak terbanyak menang."
      },
      "reversi": {
        "name": "Reversi",
        "overview": "Reversi adalah permainan strategi balik-cakram 8×8 klasik. Tempatkan cakrammu di kotak kosong yang mengapit setidaknya satu garis lurus cakram musuh dengan warnamu di ujung jauh. Semua cakram yang terjepit berubah ke warnamu. Pemain dengan cakram terbanyak saat kedua sisi tidak bisa bergerak menang."
      },
      "tictactoe": {
        "name": "Tic Tac Toe",
        "overview": "Tic Tac Toe adalah permainan klasik dua pemain di kisi 3×3. Pemain bergiliran menempatkan tanda, X atau O, bertujuan mendapatkan tiga sejajar sebelum lawan."
      },
      "matchpairs": {
        "name": "Cocok Pasangan",
        "overview": "Balik kartu dua sekaligus untuk menemukan pasangan yang cocok. Saat menemukan kecocokan, pasangan itu milikmu dan kamu balik lagi segera. Saat meleset, kedua kartu kembali tertutup dan giliran pindah. Permainan berakhir saat semua pasangan diklaim, pasangan terbanyak menang. Solo: tantang dirimu menyelesaikan papan dalam langkah lebih sedikit."
      },
      "checkers": {
        "name": "Dam",
        "overview": "Dam (American Draughts) adalah permainan strategi dua pemain di kotak gelap papan 8×8. Setiap sisi memulai dengan 12 bidak; tujuannya adalah menangkap semua bidak lawan atau memblokir lawan sehingga tidak punya langkah legal."
      },
      "chess": {
        "name": "Catur",
        "overview": "Catur adalah permainan strategi dua pemain di papan 8×8. Setiap pemain memulai dengan 16 bidak; tujuannya adalah memberikan skakmat, menyerang raja lawan sehingga tidak ada jalan keluar legal."
      },
      "crocsnap": {
        "name": "Gigit Buaya",
        "overview": "Croc Snap adalah permainan pesta penuh ketegangan untuk 2–4 pemain. Seekor buaya memiliki 12 gigi, salah satunya memicu gigitan! Bergiliran menekan gigi dan berharap tidak digigit."
      }
    }
  },
  {
    "code": "vi",
    "name": "Tiếng Việt",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Nối Bốn",
        "overview": "Luân phiên thả đĩa vào bàn 7 cột. Đĩa rơi xuống ô trống thấp nhất trong cột chọn. Người đầu tiên xếp bốn đĩa liên tiếp, ngang, dọc, hoặc chéo, thắng. Nếu bàn đầy không có người thắng thì hòa."
      },
      "dotlines": {
        "name": "Nối Chấm",
        "overview": "Luân phiên vẽ đường giữa các chấm liền kề trên lưới 6×6 (5×5 ô, 60 cạnh). Hoàn thành ô 1×1 bằng cách vẽ cạnh thứ tư để nhận ô và thêm lượt. Khi vẽ hết 60 đường, người có nhiều ô hơn thắng."
      },
      "reversi": {
        "name": "Lật Cờ",
        "overview": "Reversi là trò chiến thuật lật đĩa 8×8 kinh điển. Đặt đĩa lên ô trống kẹp ít nhất một đường thẳng đĩa địch với đĩa của bạn ở đầu kia. Tất cả đĩa bị kẹp đổi màu. Người nhiều đĩa hơn khi cả hai không thể đi nữa thắng."
      },
      "tictactoe": {
        "name": "Cờ Ca-rô 3x3",
        "overview": "Tic Tac Toe là trò chơi cổ điển hai người trên lưới 3×3. Người chơi luân phiên đặt dấu, X hoặc O, nhắm đến ba dấu liên tiếp trước đối thủ."
      },
      "matchpairs": {
        "name": "Ghép Đôi",
        "overview": "Lật hai lá bài mỗi lần để tìm cặp khớp. Tìm được cặp, cặp thuộc về bạn và bạn lật tiếp. Không khớp, cả hai úp lại và chuyển lượt. Kết thúc khi mọi cặp được nhận, nhiều cặp hơn thắng. Solo: thách thức bản thân hoàn thành ít nước hơn."
      },
      "checkers": {
        "name": "Cờ Đam",
        "overview": "Checkers (Cờ đam Mỹ) là trò chơi chiến thuật hai người trên ô tối của bàn 8×8. Mỗi bên bắt đầu với 12 quân; mục tiêu là bắt hết quân đối phương hoặc chặn để họ không có nước hợp lệ."
      },
      "chess": {
        "name": "Cờ Vua",
        "overview": "Cờ vua là trò chơi chiến thuật hai người trên bàn 8×8. Mỗi người bắt đầu với 16 quân; mục tiêu là chiếu hết, tấn công vua đối phương sao cho không có đường thoát hợp lệ."
      },
      "crocsnap": {
        "name": "Cá Sấu Cắn",
        "overview": "Croc Snap là trò chơi tiệc hồi hộp cho 2–4 người. Cá sấu có 12 răng, một trong số đó kích hoạt cắn! Luân phiên nhấn răng và hy vọng không bị cắn."
      }
    }
  },
  {
    "code": "tl",
    "name": "Filipino",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Kumonekta Apat",
        "overview": "Halinhinang mag-drop ng discs sa 7-column board. Ang disc mo ay bumabagsak sa pinakamababang bakanteng cell sa napiling column. Unang maka-align ng apat na discs, horizontal, vertical, o diagonal, ang panalo. Kapag puno ang board na walang panalo, tie."
      },
      "dotlines": {
        "name": "Linya ng Tuldok",
        "overview": "Halinhinang gumuhit ng mga linya sa pagitan ng magkadikit na dots sa 6×6 grid (5×5 boxes, 60 edges). Kumpletuhin ang 1×1 box sa pamamagitan ng pagguhit ng ikaapat na gilid para i-claim ito at mag-take ng isa pang turn. Kapag lahat ng 60 linya ay naguhit na, ang manlalaro na may pinakamaraming boxes ang panalo."
      },
      "reversi": {
        "name": "Baligtad",
        "overview": "Ang Reversi ay ang klasikong 8×8 disc-flip strategy game. Ilagay ang disc mo sa isang bakanteng square na naka-flank ng kahit isang linya ng kalaban na disc kasama ang sarili mong kulay sa dulo. Lahat ng na-flank na disc ay nag-flip sa kulay mo. Ang manlalaro na may pinakamaraming disc kapag wala nang makagalaw ang panalo."
      },
      "tictactoe": {
        "name": "Tik-Tak-To",
        "overview": "Ang Tic Tac Toe ay isang klasikong laro ng dalawang manlalaro sa 3×3 grid. Maglagay ng X o O, unang makakuha ng tatlong magkakasunod ang panalo."
      },
      "matchpairs": {
        "name": "Magkapares",
        "overview": "Mag-flip ng dalawang cards nang sabay para makahanap ng magkatugmang pairs. Kapag nakakita ng match, ang pair ay sa iyo at mag-flip ka ulit agad. Kapag hindi tugma, pareho bumabalik at lumilipat ang turn. Nagtatapos kapag lahat ng pair ay na-claim, pinakamaraming pairs ang panalo. Solo: subukan mong i-clear ang board sa mas kaunting moves."
      },
      "checkers": {
        "name": "Dama",
        "overview": "Ang Checkers (American Draughts) ay isang two-player strategy game sa mga dark squares ng 8×8 board. Ang bawat panig ay nagsisimula ng 12 men; ang layunin ay mahuli lahat ng piyesa ng kalaban o i-block sila na walang legal na galaw."
      },
      "chess": {
        "name": "Ahedres",
        "overview": "Ang Chess ay isang two-player strategy game sa 8×8 board. Ang bawat manlalaro ay nagsisimula ng 16 piyesa; ang layunin ay mag-deliver ng checkmate, atakihin ang hari ng kalaban na walang legal na escape."
      },
      "crocsnap": {
        "name": "Kagat ng Buwaya",
        "overview": "Ang Croc Snap ay isang nakaka-kaba na party game para sa 2–4 manlalaro. May 12 ngipin ang buwaya, isa sa mga ito ang trigger ng snap! Mag-turn na pindutin ang ngipin at sana hindi ka makagat."
      }
    }
  },
  {
    "code": "bn",
    "name": "বাংলা",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "কানেক্ট ফোর",
        "overview": "৭-কলামে ডিস্ক ফেলুন। চার সারিতে প্রথম জয়।"
      },
      "dotlines": {
        "name": "ডট লাইনস",
        "overview": "৬×৬ ডট গ্রিডে লাইন আঁকুন। বাক্স সম্পূর্ণ করুন।"
      },
      "reversi": {
        "name": "রিভার্সি",
        "overview": "৮×৮ বোর্ডে ডিস্ক ফ্ল্যাঙ্ক করে উল্টান।"
      },
      "tictactoe": {
        "name": "ক্রস-জিরো",
        "overview": "টিক ট্যাক টো ৩×৩ গ্রিডে ক্লাসিক। তিন এক সারিতে আগে রাখুন।"
      },
      "matchpairs": {
        "name": "জোড়া মেলাও",
        "overview": "দুটি পাতা উল্টান, মিল খুঁজুন। বেশি জোড়া জিতবে।"
      },
      "checkers": {
        "name": "চেকার্স",
        "overview": "চেকার্স ৮×৮ বোর্ডে কৌশল খেলা।"
      },
      "chess": {
        "name": "দাবা",
        "overview": "দাবা ৮×৮ বোর্ডে কৌশল খেলা। প্রতিপক্ষ রাজাকে চেকমেট করুন।"
      },
      "crocsnap": {
        "name": "ক্রোক স্ন্যাপ",
        "overview": "ক্রক স্ন্যাপ ২–৪ খেলোয়াড়ের রোমাঞ্চকর পার্টি গেম। ১২ দাঁতে একটি কামড়!"
      }
    }
  },
  {
    "code": "mr",
    "name": "मराठी",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "कनेक्ट फोर",
        "overview": "7-कॉलम बोर्डमध्ये गोटी टाका."
      },
      "dotlines": {
        "name": "डॉट लाइन्स",
        "overview": "6×6 डॉट ग्रिडवर रेषा काढा."
      },
      "reversi": {
        "name": "रिव्हर्सी",
        "overview": "8×8 बोर्डवर गोट्या घेरून उलटवा."
      },
      "tictactoe": {
        "name": "फुल्ली-क्रॉस",
        "overview": "टिक टॅक टो 3×3 ग्रिडवरचा क्लासिक. तीन एका ओळीत आधी ठेवा."
      },
      "matchpairs": {
        "name": "जोडी जुळवा",
        "overview": "दोन पत्ते उलटवा, जोड्या शोधा."
      },
      "checkers": {
        "name": "चेकर्स",
        "overview": "चेकर्स 8×8 बोर्डवर दोन खेळाडूंचा खेळ."
      },
      "chess": {
        "name": "बुद्धिबळ",
        "overview": "बुद्धिबळ 8×8 बोर्डवर दोन खेळाडूंचा रणनीती खेळ."
      },
      "crocsnap": {
        "name": "क्रोक स्नॅप",
        "overview": "क्रोक स्नॅप 2–4 खेळाडूंचा रोमांचक पार्टी गेम."
      }
    }
  },
  {
    "code": "ta",
    "name": "தமிழ்",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "கனெக்ட் ஃபோர்",
        "overview": "7-நெடுவரிசையில் வட்டு போடுங்கள்."
      },
      "dotlines": {
        "name": "டாட் லைன்ஸ்",
        "overview": "6×6 புள்ளி கட்டத்தில் கோடுகள் வரையுங்கள்."
      },
      "reversi": {
        "name": "ரிவர்சி",
        "overview": "8×8 போர்டில் எதிரி வட்டுகளை புரட்டுங்கள்."
      },
      "tictactoe": {
        "name": "டிக்-டாக்-டோ",
        "overview": "டிக் டாக் டோ 3×3 கட்டத்தில் கிளாசிக் விளையாட்டு."
      },
      "matchpairs": {
        "name": "ஜோடி சேர்",
        "overview": "இரண்டு கார்டுகள் புரட்டி ஜோடி கண்டுபிடியுங்கள்."
      },
      "checkers": {
        "name": "செக்கர்ஸ்",
        "overview": "செக்கர்ஸ் 8×8 போர்டில் இரு வீரர்களின் விளையாட்டு."
      },
      "chess": {
        "name": "சதுரங்கம்",
        "overview": "செஸ் 8×8 போர்டில் இரு வீரர்களின் உத்தி."
      },
      "crocsnap": {
        "name": "குரோக் ஸ்னாப்",
        "overview": "க்ராக் ஸ்னாப் 2–4 வீரர்களுக்கான பரபரப்பு விளையாட்டு."
      }
    }
  },
  {
    "code": "pcm",
    "name": "Naijá",
    "rtl": false,
    "games": {
      "connectfour": {
        "name": "Line Up Four",
        "overview": "Take turns drop discs into 7-column board. Your disc fall to di lowest empty cell for di column wey you choose. First person to line up four discs, horizontal, vertical, or diagonal, win. If board full without winner, na draw."
      },
      "dotlines": {
        "name": "Dot Line",
        "overview": "Take turns draw lines between dots wey dey next to each other for 6×6 grid (5×5 boxes, 60 edges). Complete 1×1 box by drawing di fourth side to claim am and take another turn. When all 60 lines don draw, di player with most boxes win."
      },
      "reversi": {
        "name": "Flip Game",
        "overview": "Reversi na di classic 8×8 disc-flip strategy game. Place your disc for empty square wey flank at least one straight line of enemy discs with your own colour for di far end. All flanked discs flip to your colour. Player with most discs when nobody fit move win."
      },
      "tictactoe": {
        "name": "X and O",
        "overview": "Tic Tac Toe na classic two-player game for 3×3 grid. Players take turns to put their mark, X or O, try to get three for a row before di opponent."
      },
      "matchpairs": {
        "name": "Match Pair",
        "overview": "Flip two cards at a time to find matching pairs. When you find match, di pair na yours and you flip again immediately. When you miss, both cards flip back and turn pass. Game end when every pair don claim, most pairs win. Solo: challenge yourself to clear board for fewer moves."
      },
      "checkers": {
        "name": "Draught",
        "overview": "Checkers (American Draughts) na two-player strategy game for di dark squares of 8×8 board. Each side start with 12 men; di goal na to capture every opponent piece or block dem so dem no get legal move."
      },
      "chess": {
        "name": "Chess",
        "overview": "Chess na two-player strategy game for 8×8 board. Each player start with 16 pieces; di goal na to deliver checkmate, attack di opponent king so e no get any legal escape."
      },
      "crocsnap": {
        "name": "Croco Bite",
        "overview": "Croc Snap na suspense party game for 2–4 people. Crocodile get 12 teeth, one of dem go trigger di snap! Take turns to press teeth and hope say e no go bite you."
      }
    }
  }
]
