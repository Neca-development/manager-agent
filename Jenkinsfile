pipeline {
  agent any
  environment {
    REGISTRY_HOST = credentials('docker-registry-host')
    REGISTRY_HOST_REMOTE = credentials('docker-registry-domain')
    JENKINS_SERVER = credentials('jenkins-server')
    GIT_REPO_NAME = env.GIT_URL.replaceFirst(/^.*\/([^\/]+?).git$/, '$1').toLowerCase().trim()
    COMPOSE_PROJECT_NAME = 'deogen'
    SLACK_CHANNEL = 'C08C9UMH07L'
  }

  stages {

    stage('Build') {
      when {
        allOf {
          not {
            changeRequest()
          }
          anyOf {
            branch 'master'
            branch 'main'
            branch 'stage'
            branch 'dev'
            branch 'development'
          }
        }
      }


      steps {
        script {
          sh """
            case \$BRANCH_NAME in
              development)
                DOCKER_ENV=development
                ;;
              stage)
                DOCKER_ENV=stage
                ;;
              master | main)
                DOCKER_ENV=production
                ;;
              *)
                DOCKER_ENV=development
                ;;
            esac

            sed -i -e "s/DB_HOST=localhost/DB_HOST=pg_db/" .development.env || true
            sed -i -e "s/DB_HOST=localhost/DB_HOST=pg_db/" .stage.env || true
            sed -i -e "s/DB_HOST=localhost/DB_HOST=pg_db/" .production.env || true

            docker build . \
              -f Dockerfile \
              --build-arg DOCKER_ENV=\${DOCKER_ENV} \
              -t ${GIT_REPO_NAME}.\${BRANCH_NAME} \
              -t ${GIT_REPO_NAME}.\${BRANCH_NAME}:\${BUILD_NUMBER} \
              -t \${REGISTRY_HOST}/${GIT_REPO_NAME}.\${BRANCH_NAME} \
              -t \${REGISTRY_HOST}/${GIT_REPO_NAME}.\${BRANCH_NAME}:\${BUILD_NUMBER} \
              -t ${GIT_REPO_NAME}-\${BRANCH_NAME} \
              -t ${GIT_REPO_NAME}-\${BRANCH_NAME}:\${BUILD_NUMBER} \
              -t \${REGISTRY_HOST}/${GIT_REPO_NAME}-\${BRANCH_NAME} \
              -t \${REGISTRY_HOST}/${GIT_REPO_NAME}-\${BRANCH_NAME}:\${BUILD_NUMBER}

            docker push -a \${REGISTRY_HOST}/${GIT_REPO_NAME}.\${BRANCH_NAME}
          """

          if (
            env.BRANCH_NAME == "master" ||
            env.BRANCH_NAME == "main"
          ) {
            slackSend channel: env.SLACK_CHANNEL, color: "good", message: "Build for ${GIT_REPO_NAME} was successfull.\nPlease approve the build when you finish testing.";
          }
        }
      }
    }

    stage('Start') {
      parallel {

        stage('Dev') {
          when {
            allOf {
              not {
                changeRequest()
              }
              anyOf {
                branch 'development'
                branch 'dev'
              }
            }
          }

          environment {
            ENV_FILE = '.development.env'
            PUBLIC_URL = ''
          }

          steps {
            script {
              sh """
                echo REGISTRY_HOST=${REGISTRY_HOST} >> ${ENV_FILE}
                echo GIT_REPO_NAME=${GIT_REPO_NAME} >> ${ENV_FILE}
                echo BRANCH_NAME=${BRANCH_NAME} >> ${ENV_FILE}
                echo COMPOSE_PROJECT_NAME=development-${COMPOSE_PROJECT_NAME} >> ${ENV_FILE}

                COMPOSE_PROJECT_NAME=development-${COMPOSE_PROJECT_NAME} docker-compose --env-file ${ENV_FILE} up -d
              """
            }
            slackSend channel: env.SLACK_CHANNEL, color: "good", message: "Build for ${GIT_REPO_NAME}/${BRANCH_NAME} is successfull: ${PUBLIC_URL}"
          }
        }
      }
    }
  }

  post {
    failure {
      script {
        if (
          env.BRANCH_NAME == "development" ||
          env.BRANCH_NAME == "dev"
        ) {
          notify_slack('Build failure')
        }
      }
    }
  }
}