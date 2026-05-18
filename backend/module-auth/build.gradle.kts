dependencies {
    implementation(project(":common-web"))
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.cache)
    implementation(libs.spring.data.redis)
    implementation(libs.jjwt.api)
    runtimeOnly(libs.jjwt.impl)
    runtimeOnly(libs.jjwt.jackson)
}
