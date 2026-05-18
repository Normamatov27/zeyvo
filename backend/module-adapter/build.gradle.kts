dependencies {
    implementation(project(":common-web"))
    implementation(project(":module-queue"))
    implementation(project(":module-tenant"))
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.data.redis)
}
