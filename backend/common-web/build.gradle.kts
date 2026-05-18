dependencies {
    api(libs.spring.boot.starter.web)
    api(libs.spring.boot.starter.validation)
    api(libs.spring.boot.starter.security)
    api(libs.springdoc.openapi)
    implementation(libs.jjwt.api)
    implementation(libs.bucket4j.core)
    runtimeOnly(libs.jjwt.impl)
    runtimeOnly(libs.jjwt.jackson)
}
