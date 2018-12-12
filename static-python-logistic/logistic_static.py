# -*- coding: utf-8 -*-
"""
Created on Wed Nov 28 11:19:15 2018

@author: AVANTIKA GUPTA
"""

# -*- coding: utf-8 -*-
"""
Created on Sun Nov 25 03:13:21 2018

@author: AVANTIKA GUPTA
"""
# from flask import Flask
from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np
import random
import sys
import json
from sklearn.linear_model import LogisticRegression
import math
from collections import Counter
from sklearn import metrics
import pickle

# app = Flask(__name__)

def TL():
    allurls = 'major.combined.csv'	#path to our all urls file
    allurlscsv = pd.read_csv(allurls,',',error_bad_lines=False)	#reading file
    allurlsdata = pd.DataFrame(allurlscsv)	#converting to a dataframe

    allurlsdata = np.array(allurlsdata)	#converting it into an array
    random.shuffle(allurlsdata)	#shuffling
    #arr=np.array(allurlsdata)
    x=allurlsdata[1:,2:]
    y=allurlsdata[1:,1]
    X_train, X_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)	#split into training and testing set 80/20 ratio
    
    lgs = LogisticRegression()	#using logistic regression
    lgs.fit(X_train, y_train)
    y_pred = lgs.predict(X_test)
    cnf_matrix = metrics.confusion_matrix(y_test, y_pred)
    print(cnf_matrix)
    print(lgs.score(X_test, y_test))	#pring the score. It comes out to be 98%
    return lgs
    


def main():
    lgs=TL()
    filename = 'finalized_model_static.sav'
    pickle.dump(lgs, open(filename, 'wb'))

if __name__ == '__main__':
    main()