dependencies {
    implementation(project(":common-web"))
    implementation(project(":module-queue"))
    implementation(project(":module-tenant"))
    implementation(project(":module-auth"))
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.websocket)
    implementation(libs.spring.data.redis)
    implementation(libs.jjwt.api)
    runtimeOnly(libs.jjwt.impl)
    runtimeOnly(libs.jjwt.jackson)
}
