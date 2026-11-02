
pipeline {
    agent any

    options {
        timestamps()
        skipDefaultCheckout(true)
        timeout(time: 60, unit: 'MINUTES')
    }

    environment {
        GIT_URL = 'https://github.com/Adi19471/CFS-automation.git'
        DOCKER_IMAGE = 'cfs-playwright'
        REPORT_DIR = 'playwright-report'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning CFS Automation Repository'

                git branch: 'main',
                    url: "${GIT_URL}"
            }
        }

        stage('Check Docker') {
            steps {
                bat 'docker --version'
                bat 'docker info'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat """
                    docker build -t %DOCKER_IMAGE%:%BUILD_NUMBER% .
                """
            }
        }

        stage('Run Playwright Tests') {
            steps {
                script {
                    bat """
                        docker run --rm ^
                        -e CI=true ^
                        -v "%WORKSPACE%:/app" ^
                        -w /app ^
                        %DOCKER_IMAGE%:%BUILD_NUMBER% ^
                        npx playwright test
                    """
                }
            }
        }

        stage('Generate Reports') {
            steps {
                echo 'Playwright HTML and Allure reports generated.'
                bat 'if exist playwright-report (dir playwright-report) else (echo HTML report not found)'
                bat 'if exist allure-results (dir allure-results) else (echo Allure results not found)'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: '''
                playwright-report/**,
                allure-results/**,
                test-results/**,
                **/*.log
            ''',
            allowEmptyArchive: true

            echo 'CFS Automation execution completed.'
        }

        success {
            echo 'SUCCESS: All Playwright tests passed.'
        }

        failure {
            echo 'FAILURE: Playwright tests failed. Check reports and screenshots.'
        }

        cleanup {
            bat 'docker image prune -f'
        }
    }
}
