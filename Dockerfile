FROM jenkins
COPY plugins.txt /usr/share/jenkins/plugins.txt
COPY jobs/Build_From_Folder/config.xml /usr/share/jenkins/ref/jobs/Build_From_Folder/config.xml
COPY jobs/Build_From_GIT_Example/config.xml /usr/share/jenkins/ref/jobs/Build_From_GIT_Example/config.xml
COPY jobs/DestructuveBuild/config.xml /usr/share/jenkins/ref/jobs/DestructuveBuild/config.xml
COPY jobs/Extract_From_Envorinment/config.xml /usr/share/jenkins/ref/jobs/Extract_From_Envorinment/config.xml
COPY jobs/Extract_Package_From_Envorinment/config.xml /usr/share/jenkins/ref/jobs/Extract_Package_From_Envorinment/config.xml
RUN /usr/local/bin/plugins.sh /usr/share/jenkins/plugins.txt
USER root