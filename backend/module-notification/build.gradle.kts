dependencies {
    implementation(project(":common-web"))
    implementation(project(":module-queue"))
    implementation(project(":module-auth"))
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.web)
}
