    package main

    import (
        "encoding/json"
        "log"
        "os"
        "github.com/johnbalvin/goelp"
    )
    func main(){
        //you need to have write permissions, the result will be save inside folder "test"
        if err := os.MkdirAll("./test/images", 0644); err != nil {
            log.Println("test 1 -> err: ", err)
            return
        }
        proxyURL, err := goelp.ParseProxy("http://[IP | domain]:[port]", "username", "password")
        if err != nil {
            log.Println("test:1 -> err: ", err)
            return
        }
        client := goelp.NewClient("es_MX", "San Francisco, CA", goelp.SortHighestRate, proxyURL)
        yelpBizURL:="https://www.yelp.com.mx/biz/[yelp bizness name]"
        data,  err := client.GetFromYelpBizURL(yelpBizURL)
        if err != nil {
            log.Println("test:2 -> err: ", err)
            continue
        }
        if err := data.SetImages(client.ProxyURL); err != nil {
            log.Println("test:3 -> err: ", err)
            return
        }
        for j, img := range data.Images {
        	fname3 := fmt.Sprintf("./test/images/%d%s", j, img.Extension)
        	os.WriteFile(fname3, img.Content, 0644)
        }
        f, err := os.Create("./test/data.json")
        if err != nil {
            log.Println("test:4 -> err: ", err)
            return
        }
        json.NewEncoder(f).Encode(data)
    }