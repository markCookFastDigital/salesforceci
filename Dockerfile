FROM jenkins/jenkins:lts
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
COPY plugins.txt /usr/share/jenkins/plugins.txt

COPY jobs /usr/share/jenkins/ref/jobs
COPY CI/* /usr/share/jenkins/ref/CI/
RUN /usr/local/bin/plugins.sh /usr/share/jenkins/plugins.txt
USER root
RUN wget https://developer.salesforce.com/media/salesforce-cli/sfdx-linux-amd64.tar.xz
RUN mkdir sfdx-cli
RUN tar xJf sfdx-linux-amd64.tar.xz -C sfdx-cli --strip-components 1
Run ./sfdx-cli/install