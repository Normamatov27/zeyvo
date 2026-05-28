dependencies {
    implementation(project(":common-web"))
    implementation(project(":module-tenant"))
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.jooq)
}
