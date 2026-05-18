plugins {
    alias(libs.plugins.spring.boot)
}

dependencies {
    implementation(project(":common-web"))
    implementation(project(":module-auth"))
    implementation(project(":module-queue"))
    implementation(project(":module-tenant"))
    implementation(project(":module-notification"))
    implementation(project(":module-analytics"))
    implementation(project(":module-realtime"))
    implementation(project(":module-adapter"))

    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.websocket)
    implementation(libs.spring.boot.starter.security)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.cache)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.actuator)
    implementation(libs.spring.data.redis)
    implementation(libs.postgresql)
    implementation(libs.flyway.core)
    implementation(libs.flyway.postgres)
    implementation(libs.jjwt.api)
    implementation(libs.springdoc.openapi)
    implementation(libs.micrometer.prometheus)
    implementation(libs.bucket4j.core)
    implementation(libs.shedlock.spring)
    implementation(libs.shedlock.jdbc)
    runtimeOnly(libs.jjwt.impl)
    runtimeOnly(libs.jjwt.jackson)

    testImplementation(libs.testcontainers.postgres)
    testImplementation(libs.rest.assured)
    testImplementation(libs.rest.assured.json)
}

springBoot {
    buildInfo()
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName = "zeyvo.jar"
}
