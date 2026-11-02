/**
 * CFS Playwright suite on Jenkins: a Windows agent builds the image and runs the tests
 * in Docker. The job reads this file from Git and checks out the branch the job is set
 * to, so no branch is named here.
 *
 * Jenkins needs:
 *   - Docker Desktop running on the agent.
 *   - For the signed-in tests, a "Username with password" credential with the ID
 *     cfs-<TEST_ENV>-login, e.g. cfs-dev-login. Without one the build still runs the
 *     signed-out tests and says so.
 *
 * Every test is read-only: ALLOW_WRITES is not set, so @write tests stay skipped.
 * Failed tests make the build UNSTABLE; FAILURE means the pipeline itself broke.
 */
pipeline {
    agent any

    parameters {
        choice(name: 'TEST_LEVEL', choices: ['smoke', 'sanity', 'regression'], description: 'smoke = is the app up, sanity = the core of each module, regression = everything')
        choice(name: 'TEST_ENV', choices: ['dev', 'uat'], description: 'CFS environment to test')
    }

    options {
        timestamps()
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 2, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        IMAGE = 'cfs-playwright:latest'
        CONTAINER = "cfs-playwright-${env.BUILD_NUMBER}"
        LOGIN_ID = "cfs-${params.TEST_ENV}-login"
    }

    stages {
        stage('Checkout') {
            steps {
                // Starts clean, so a report from an earlier build can never be mistaken for this one.
                cleanWs()
                checkout scm
            }
        }

        stage('Check Docker') {
            steps {
                script {
                    if (bat(returnStatus: true, script: '@docker info > nul 2>&1') != 0) {
                        error('Docker is not running on this machine. Start Docker Desktop, then build again.')
                    }
                }
            }
        }

        stage('Build image') {
            steps {
                bat 'docker build -t %IMAGE% .'
            }
        }

        stage('Run tests') {
            steps {
                script {
                    // Regression is the complete read-only suite, so it takes in the other levels.
                    def grep = [smoke: '@smoke', sanity: '@sanity', regression: '@smoke|@sanity|@regression'][params.TEST_LEVEL]

                    // -e NAME hands a variable over by name, so the password is never on a command line.
                    def runTests = { String filter ->
                        bat(returnStatus: true, script: "docker run --init --ipc=host --name %CONTAINER% -e TEST_ENV -e CFS_USERNAME -e CFS_PASSWORD -e WORKERS=3 -e RETRIES=1 %IMAGE% npx playwright test ${filter}")
                    }

                    def status
                    try {
                        withCredentials([usernamePassword(credentialsId: env.LOGIN_ID, usernameVariable: 'CFS_USERNAME', passwordVariable: 'CFS_PASSWORD')]) {
                            status = runTests("--grep \"${grep}\"")
                        }
                    } catch (org.jenkinsci.plugins.credentialsbinding.impl.CredentialNotFoundException missing) {
                        unstable("No Jenkins credential with the ID ${env.LOGIN_ID}, so only the signed-out tests ran.")
                        status = runTests('--project=public')
                    }

                    if (status != 0) {
                        unstable("Playwright exited with ${status}. See the CFS Test Report.")
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // The tests ran in the container, so their reports are copied out of it.
                // A build that stopped before the tests has none, and that is not an error.
                for (folder in ['cfs-report', 'playwright-report', 'allure-results', 'junit']) {
                    bat(returnStatus: true, script: "@docker cp %CONTAINER%:/app/${folder} ${folder} > nul 2>&1")
                }
            }
            junit allowEmptyResults: true, testResults: 'junit/results.xml'
            publishHTML(target: [reportName: 'CFS Test Report', reportDir: 'cfs-report', reportFiles: 'index.html', keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
            archiveArtifacts artifacts: 'cfs-report/**, playwright-report/**, allure-results/**', allowEmptyArchive: true
        }

        // Tidying up must never change the build's result, also when Docker is down.
        cleanup {
            bat(returnStatus: true, script: '@docker rm -f %CONTAINER% > nul 2>&1')
            bat(returnStatus: true, script: '@docker image prune -f > nul 2>&1')
        }
    }
}
