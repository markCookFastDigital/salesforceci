FROM jenkins/jenkins:lts
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
COPY plugins.txt /usr/share/jenkins/plugins.txt

COPY jobs /usr/share/jenkins/ref/jobs
COPY CI/* /usr/share/jenkins/ref/CI/
RUN /usr/local/bin/plugins.sh /usr/share/jenkins/plugins.txt
USER root
# For Use of SFDX CLI uncomment below before building
# RUN mkdir sfdx-cli
# RUN tar xJf sfdx-linux-amd64.tar.xz -C sfdx-cli --strip-components 1
# RUN ./sfdx-cli/install
RUN apt-get update
RUN apt-get install -y apt-transport-https git-core curl build-essential openssl libssl-dev git ant
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y nodejs 

RUN nodejs -v