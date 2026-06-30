export type Review = {
  id: string;
  author: string;
  text: string;
  language: "ru" | "sr" | "en";
  rating: 5;
  source: "google";
};

export const googleReviews: readonly Review[] = [
  {
    id: "alla-kostina-google",
    author: "Алла Костина",
    language: "ru",
    rating: 5,
    source: "google",
    text: `Очень понравился этот массажный салон. Удобное расположение, легко найти и добраться.

Отдельное спасибо массажистам Екатерине и Сергею. Была у обоих специалистов, и каждый раз оставалась довольна. Очень внимательные, работают профессионально, учитывают пожелания и действительно помогают снять напряжение и усталость.

В салоне приятная атмосфера, чисто и уютно, персонал доброжелательный. После массажа всегда чувствуешь себя намного лучше.

Однозначно рекомендую тем, кто ищет хороший массаж и комфортную обстановку. Буду приходить еще.`
  },
  {
    id: "valeria-google",
    author: "Valeria",
    language: "sr",
    rating: 5,
    source: "google",
    text:
      "Dolazim ovde na masažu i uvek se posle nje osećam osveženo i opušteno. Koriste se prirodna ulja, prostor je svetao i prijatan, a sto za masažu veoma udoban. Ovde postoji više vrsta masaža i drugi tretmani. Terapeuti za masažu su profesionalni, uvek pozitivni i ljubazni, veliko hvala njima! Preporučujem salon svim svojim prijateljima i dolazim sama čim mi se ukaže prilika."
  },
  {
    id: "darya-bessolitsyna-google",
    author: "Darya Bessolitsyna",
    language: "en",
    rating: 5,
    source: "google",
    text:
      "Had a great massage from Sergey. Had a really bad muscle blockage and he did such a great job. Just after 3 visits I am feeling like 10 years younger. Sergey was very attentive and considerate. I felt very relaxed and calm. He will be my man for massage from bow on."
  }
];
