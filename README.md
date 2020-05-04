# salesforceci
Docker image for salesforceci folder


Setup Instructions : 

Download and install docker 

Pull this GIT Repo

Create the docker image from the source files you run the following command:

Navigate to the folder you pulled the GIT repo - 'sudo docker build -t salesforceci:v2 .'

Start the Docker Image using one of the following commands:
Quick Start, this will start the docker image but will not save any of the files locally, effectively every time you restart it will completely reinstall all the required files - docker run -p 8080:8080 -p 50000:50000  salesforceci:v2
Starting the environment but specifying a folder allows you to store the history of your files locally, each time you re-start the image it will remember any changes and build history - docker run -p 8080:8080 -p 50000:50000 -v /Users/[USERNAME]/Documents/Jenkins/docker:/var/jenkins_home salesforceci:v2
To stop the image use :
To find the name of the image use : docker ps
Then use : docker stop IMAGEID
