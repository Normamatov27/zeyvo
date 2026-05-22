dependencies {
    implementation(project(":common-web"))
    implementation(project(":module-tenant"))
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.cache)
    implementation(libs.spring.data.redis)
    implementation(libs.shedlock.spring)
    implementation(libs.shedlock.jdbc)
    testImplementation(libs.testcontainers.postgres)
}
