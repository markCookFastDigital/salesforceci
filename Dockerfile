FROM jenkins/jenkins:lts
COPY plugins.txt /usr/share/jenkins/plugins.txt
COPY jobs/Build_From_Folder/config.xml /usr/share/jenkins/ref/jobs/Build_From_Folder/config.xml
COPY jobs/Build_From_GIT_Example/config.xml /usr/share/jenkins/ref/jobs/Build_From_GIT_Example/config.xml
COPY jobs/DestructiveBuild/config.xml /usr/share/jenkins/ref/jobs/DestructiveBuild/config.xml
COPY jobs/Extract_From_Environment/config.xml /usr/share/jenkins/ref/jobs/Extract_From_Environment/config.xml
COPY jobs/Extract_Package_From_Environment/config.xml /usr/share/jenkins/ref/jobs/Extract_Package_From_Environment/config.xml
COPY jobs/Pull_and_commit_to_GIT/config.xml /usr/share/jenkins/ref/jobs/Pull_and_commit_to_GIT/config.xml
COPY jobs/Build_From_GIT_Create_Tag_Example/config.xml /usr/share/jenkins/ref/jobs/Build_From_GIT_Create_Tag_Example/config.xml
COPY CI/* /usr/share/jenkins/ref/CI/
RUN /usr/local/bin/plugins.sh /usr/share/jenkins/plugins.txt
USER root