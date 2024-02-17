from datetime import datetime
from distutils.log import error

from os import stat

from typing import List, Tuple
from chess import Move
from chess.pgn import Game, read_game
from dotenv import dotenv_values
import chess.engine as engine

import time
import json
import io
from sys import argv
from GameAnalysis import GameAnalysis

def analyseGameMeasurements(fileOutput: str)->None:
    games = getGames(r"C:\MyPuzzles\MyPuzzles.com\UnitTests\crackcubano_vs_gsvc.txt")
    gameAnalysis = None
    movePerformance = []
    sums = (0,0,0)
    count = 0
    for game in games:
        gameAnalysis = GameAnalysis(game, 16,4)
        for move in game.mainline_moves():
            startTime = time.time_ns()
            gameAnalysis.updateBoard(move)
            gameAnalysis.getAnalysis(1,engine.INFO_ALL)
            endTime = time.time_ns()

            count+=1
            info = gameAnalysis.info
            nodes = info[0]["nodes"]
            nps = info[0]["nps"]
            responseTime = endTime-startTime
            sums = (sums[0]+nodes, sums[1]+nps, sums[2]+responseTime)
            data =str(nodes)+" "+str(nps)+" "+str(responseTime)+"\n"
            movePerformance.append(data)
    gameAnalysis.engine.close()
    with open(fileOutput, "a") as file:
        file.writelines(movePerformance)
        file.write("Averages:\n")
        file.write(str(sums[0]/count)+" "+str(sums[1]/count)+" "+str(sums[2]/count)+"\n")



def analyseGames(gamePgns, stockfishPath):
    """analyze games for puzzles and returns list of puzzles"""
    puzzles = [] 
   
    for pgn in gamePgns:
        pgnBuffer = io.StringIO(pgn)
        game = read_game(pgnBuffer)
        if(game != None):
            puzzles+= GameAnalysis(game, 16,4, stockfishPath).analyseGame()
        
        
    return puzzles
    


if __name__ == '__main__':
    
    gamePgns = list(json.loads(argv[1]))
    stockfishPath = argv[2]
    print(json.dumps(analyseGames(gamePgns, stockfishPath)))
    
    
