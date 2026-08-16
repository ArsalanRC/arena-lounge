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
  games: Record<GameId, { name: string; overview: string }>
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
      }
    }
  }
]
