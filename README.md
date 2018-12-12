# Malicious-Website-Detection
Classification of website as benign or malicious on the basis of Static and URL analysis

# Static Approach
The need to analyse any website statically arose because of the main significant XSS attack
vulnerability within a DOM based XSS attack as explained before which can be used to inject any
malicious code into the code level implementation of the website.
This malicious code will thus get triggered after the execution of legitimate JavaScript of that
particular website. Thus to find such vulnerabilities within a website, it was necessary to identify
various features like presence of onload() , onchange(), trigger, window, char_count_in_identifier,
digit_count and many more features (detailed later) as these features have the capability to alter the
DOM of a particular website on the client side.
For static analysis, a combined dataset of URLs and malicious URL’s , malicious codes (25,469
records) comprising of both benign (From Alexa) and malicious (From Phishtank) were crawled
and scanned for the presence of any JavaScript code.
Furthermore, each of the website’s internal links were crawled for extracting the JavaScript code.
This cumulative JavaScript code was utilised to construct an Abstract Syntax Tree (AST) from the
Esprima tool and was then parsed using Estraverse to extract the normalised feature values.
After the extraction of the features corresponding to each record, complete database was stored in to
MongoDB and was then converted into CSV (major.combined.csv). This was then served as an input
to the logistic regression model which then made accurate predictions.
# URL based Approach
A dataset of 4,20,464 URLs is taken of different malicious and benign websites. Each URL is further
tokenized, a separate function is made to tokenize the URLs as they not like any other word document.
Now we have to vectorize our URLs and for this purpose tfidf score is used since there are words in
URLs that are more important than other words e.g ‘virus’, ‘.exe’ ,’.dat’ etc. So matrix kind of
structure is formed having tfidf values of each token present in the pool-of documents corresponding
to different URLs. We have the vector and now it is divided into training and testing dataset. 80% of
the data is training and rest 20% is the testing dataset. Logistic regression is performed on the data as
it is fast and good for binary dependent variables. We get an accuracy of 98%. The model as well as
the vectorizer created is saved into ‘.sav’ files which are used whenever we want to predict about an
URL whether it is benign or malicious. This approach(tfidf) is used to do the classification because
there are various words or symbols which are present in many malicious URLs whose tfidf score is
valuable for classifying the URLs into benign and malicious.
