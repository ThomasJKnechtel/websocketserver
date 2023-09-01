import chess
import chess.engine as engine
from enum import Enum
from chess.pgn import Game
from typing import List, Tuple
class STATE(Enum):
        ANALYSE_MOVE=0
        COMPARE_MOVES=1
        WINNING_TURN=2
        LOSING_TURN=3
        PUZZLE_END=4
        ALL_PUZZLES_GENERATED=5
class GameAnalysis:
    """Provides Analysis of a chess game"""
    def __init__(self,  game: Game, hash:int, threads: int) -> None:
        self.board = game.board()
        self.previous_cp = 0
        self.info = None
        self.engine = engine.SimpleEngine.popen_uci(r"C:\Users\Thomas\OneDrive\JS Files\stockfish-9-win\Windows\stockfish_9_x64.exe")
        self.engine.configure({"Threads":threads})
        self.engine.configure({"hash":hash})
        self.game = game
        self.puzzles = []
        self.currentContinuation = []
        self.fen = self.board.fen()
        self.turn = None
        self.currNode = None
        self.state = STATE.ANALYSE_MOVE
    def getAnalysis(self, topMoveCount: int, infoType):
        """Updates the objects info object with data from engine"""
        self.info = self.engine.analyse(self.board, engine.Limit(depth=12),multipv=topMoveCount, info=infoType)
    def updateBoard(self, move: str)->bool:
        """Update board position with move if legal"""
        if(self.board.is_legal(move)):
            self.board.push(move)
            return True
        return False
    def isWinning(self, line: int, centipawn: int):
        """Check if current position has winning line i.e. CP score > 2 or Mate"""
        if(len(self.info)>line):
            score = self.info[line]["score"].relative
            if score.is_mate():
                return True
            elif score.score()>centipawn:
                return True
        return False
    def isOnlyMove(self):
        """Check if only one winning move"""
        if self.isWinning(1, 200):
            return False
        else:
            return True
        
    def stopEngine(self):
        """Stops engine"""
        self.engine.close()
    def getMove(self, ply: int)->chess.Move:
        """Returns best move at ply"""
        try:
            return self.info[0]['pv'].pop(0)
        except: return None
    def moveToString(self, move: chess.Move)->str:
        return self.board.san(move)
    def analyseGame(self)->list[Tuple[str,str,str,str, str,int,int, int]]:
        """Generates puzzles for a game
        >>>analyseGame(getGames("game"))
        [[['d8d5'], '3r4/2R2pkp/1q2pbp1/p7/1p2Q3/1P3P2/4P2P/2R4K b - - 9 37'], [['b4e4'], '8/7R/4p3/4k1p1/1R6/1P3P2/2r4b/5K2 w - - 0 52'], ... 
        ... [['h7f7'], '8/7R/4p3/5kp1/4R3/1P3P2/2r4b/5K2 w - - 3 53']]]"""
        self.currNode = self.game.next()
        puzzles = None
        def stateMachine():
            if self.state == STATE.ANALYSE_MOVE:
                if self.currNode == None:
                    self.state = STATE.ALL_PUZZLES_GENERATED
                    
                elif not self.updateBoard(self.currNode.move):
                    print('Invalid Move')
                    self.stopEngine()
                    exit(1)
                else:
                    self.getAnalysis(1, engine.INFO_SCORE)
                    if self.isWinning(0, 300):
                        self.state =STATE.COMPARE_MOVES
                    else: self.state =STATE.ANALYSE_MOVE
                    self.currNode = self.currNode.next()
            elif self.state== STATE.COMPARE_MOVES:
                self.getAnalysis(2, engine.INFO_SCORE|engine.INFO_PV)
                if self.isOnlyMove() and len(self.info)>1:
                    self.state = STATE.WINNING_TURN
                    self.fen=self.board.fen()
                    self.turn = self.board.turn
                else: self.state=STATE.ANALYSE_MOVE
            elif self.state== STATE.WINNING_TURN:
                move = self.getMove(0)
                if move == None:
                    self.state = STATE.PUZZLE_END
                else:
                    self.currentContinuation.append(self.moveToString(move))
                    self.updateBoard(move)
                    self.state = STATE.LOSING_TURN
                    
               
            elif self.state==STATE.LOSING_TURN:
                move = self.getMove(1)
                if move is not None:
                    strMove = self.moveToString(move)
                    self.updateBoard(move)
                    self.getAnalysis(2, engine.INFO_SCORE|engine.INFO_PV)
                    if self.isOnlyMove():
                        self.currentContinuation.append(strMove) 
                        self.state = STATE.WINNING_TURN
                    else: self.state = STATE.PUZZLE_END
                else: 
                    self.state = STATE.PUZZLE_END
            elif self.state==STATE.PUZZLE_END:
                self.board.set_fen(self.fen)
                if(len(self.currentContinuation)>0):
                    self.puzzles.append({'white':self.game.headers["White"],'black': self.game.headers["Black"], 'date':self.game.headers["Date"],'fen': self.fen,'continuation':self.currentContinuation.copy(),'event': self.game.headers["Event"],'attempts':0,'success_rate':0, 'turn':self.turn})
                self.currentContinuation.clear()
                self.state = STATE.ANALYSE_MOVE
            elif self.state == STATE.ALL_PUZZLES_GENERATED:
                self.stopEngine()
                return self.puzzles
        while puzzles is None:
            puzzles = stateMachine()
        return puzzles
