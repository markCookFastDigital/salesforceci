FROM jenkins/jenkins:lts
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
COPY plugins.txt /usr/share/jenkins/plugins.txt

COPY jobs /usr/share/jenkins/ref/jobs
COPY CI/* /usr/share/jenkins/ref/CI/
RUN /usr/local/bin/plugins.sh /usr/share/jenkins/plugins.txt
USER root
# RUN wget https://developer.salesforce.com/media/salesforce-cli/sfdx-linux-amd64.tar.xz
# RUN mkdir sfdx-cli
# RUN tar xJf sfdx-linux-amd64.tar.xz -C sfdx-cli --strip-components 1
# RUN ./sfdx-cli/install
RUN apt-get update
RUN apt-get install -y apt-transport-https git-core curl build-essential openssl libssl-dev git
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y nodejs 
# RUN curl -sL https://deb.nodesource.com/setup_12.16.1 | bash
# RUN apt-get install --yes nodejs
# RUN node -v
# RUN npm -v

# RUN curl --silent --location https://deb.nodesource.com/setup_12.16.1.x | bash -
# RUN apt-get install --yes nodejs
# RUN apt-get install --yes build-essential

RUN nodejs -v