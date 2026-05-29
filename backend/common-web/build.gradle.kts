dependencies {
    api(libs.spring.boot.starter.web)
    api(libs.spring.boot.starter.validation)
    api(libs.spring.boot.starter.security)
    api(libs.springdoc.openapi)
    compileOnly(libs.spring.boot.starter.data.jpa)
    implementation(libs.jjwt.api)
    implementation(libs.bucket4j.core)
    implementation(libs.bucket4j.redis)
    implementation(libs.spring.data.redis)
    runtimeOnly(libs.jjwt.impl)
    runtimeOnly(libs.jjwt.jackson)
}
